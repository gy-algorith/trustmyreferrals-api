import { Controller, Post, UseGuards, Get, Body, Param, Logger } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { InjectRepository } from '@nestjs/typeorm';
import { User, StripeOnboardingStatus } from '../entities/user.entity';
import { UserRole } from '../common/enums/user-role.enum';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { User as UserDecorator } from '../common/decorators/user.decorator';
import { Transaction, TransactionType, TransactionStatus } from '../entities/transaction.entity';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags, ApiBody, ApiParam } from '@nestjs/swagger';
import { BadRequestException } from '@nestjs/common';
import { Settings } from '../entities/settings.entity';

@ApiTags('Payment')
@ApiBearerAuth()
@Controller('payment')
@UseGuards(JwtAuthGuard)
export class PaymentController {
  constructor(
    private readonly paymentService: PaymentService,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,
    @InjectRepository(Settings)
    private readonly settingsRepo: Repository<Settings>,
  ) {
    this.logger.log(`PaymentController initialized. allowedDomains=${JSON.stringify(this.allowedDomains)}`);
  }

  private readonly logger = new Logger(PaymentController.name);

  // 허용 도메인 리스트
  private readonly allowedDomains = [
    'http://localhost:3000',
    'http://3.80.115.250:3000',
    'http://192.168.0.204:3000',
    'http://18.208.163.97:3000',
    'https://api-dev.trustmyreferrals.com',
    'https://dev.trustmyreferrals.com',
    'http://192.168.0.204:3000',
    'http://192.168.0.229:4000'
  ];

  // Settings helper methods
  private async getNumberSetting(key: string, defaultValue: number = 0): Promise<number> {
    const setting = await this.settingsRepo.findOne({ where: { key, isActive: true } });
    return setting ? parseFloat(setting.value) : defaultValue;
  }

  private async calculateWithdrawalAmount(requestedAmount: number): Promise<{
    requestedAmount: number;
    processingFee: number;
    netAmount: number;
    feePercentage: number;
  }> {
    const feePercentage = await this.getNumberSetting('withdrawal_processing_fee_percentage', 3);
    const processingFee = Math.round(requestedAmount * (feePercentage / 100));
    const netAmount = requestedAmount - processingFee;

    return {
      requestedAmount,
      processingFee,
      netAmount,
      feePercentage,
    };
  }

  private async validateWithdrawalAmount(amount: number): Promise<{
    isValid: boolean;
    minAmount: number;
    maxAmount: number;
    error?: string;
  }> {
    const minAmount = await this.getNumberSetting('withdrawal_minimum_amount', 1000);
    const maxAmount = await this.getNumberSetting('withdrawal_maximum_amount', 1000000);

    if (amount < minAmount) {
      return {
        isValid: false,
        minAmount,
        maxAmount,
        error: `Withdrawal amount must be at least $${(minAmount / 100).toFixed(2)}`,
      };
    }

    if (amount > maxAmount) {
      return {
        isValid: false,
        minAmount,
        maxAmount,
        error: `Withdrawal amount cannot exceed $${(maxAmount / 100).toFixed(2)}`,
      };
    }

    return {
      isValid: true,
      minAmount,
      maxAmount,
    };
  }

  @Post('connect-link')
  @UseGuards(RolesGuard)
  @Roles(UserRole.REFERRER)
  @ApiOperation({ summary: 'Create Stripe Connect onboarding link', description: 'Creates a Stripe Connect onboarding link for the referrer. If the account does not exist, it will be created. Status updates are handled automatically via webhooks.' })
  @ApiResponse({ status: 201, description: 'Onboarding link created', schema: { example: { url: 'https://connect.stripe.com/...' } } })
  @ApiResponse({ status: 400, description: 'Bad request - user must be a referrer' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - candidate users cannot access this endpoint' })
  async createConnectLink(@UserDecorator() user: { id: string }) {
    const referrer = await this.userRepo.findOne({ where: { id: user.id } });

    if (!referrer || referrer.role !== UserRole.REFERRER) {
      throw new BadRequestException('User must be a referrer to create connect link');
    }

    let accountId = referrer.stripeAccountId;
    if (!accountId) {
      accountId = await this.paymentService.createConnectAccount({
        email: referrer.email,
        userId: referrer.id,
      });
      referrer.stripeAccountId = accountId;
      referrer.stripeOnboardingStatus = StripeOnboardingStatus.IN_PROGRESS;
      await this.userRepo.save(referrer);
    }

    // 기본 return/refresh URL 사용 (webhook으로 상태 처리)
    const url = await this.paymentService.createAccountLink(accountId);
    return { url };
  }



  // Payment 상태 조회 API
  @Get('payment/:id/status')
  @ApiOperation({ summary: 'Get payment status', description: 'Returns the status of a specific payment.' })
  @ApiParam({ name: 'id', description: 'Payment ID' })
  @ApiResponse({ status: 200, description: 'Payment status', schema: { example: { success: true, status: 'succeeded' } } })
  @ApiResponse({ status: 404, description: 'Payment not found.' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getPaymentStatus(@UserDecorator() user: { id: string }, @Param('id') id: string) {
    const payment = await this.transactionRepo.findOne({ where: { id, buyUserId: user.id } });
    if (!payment) {
      return { success: false, message: 'Payment not found.' };
    }
    return { success: true, status: payment.status };
  }

  // Add Fund API
  @Post('add-fund')
  @UseGuards(RolesGuard)
  @Roles(UserRole.REFERRER)
  @ApiOperation({ summary: 'Add fund to account', description: 'Creates a Stripe Checkout Session for referrer users to add funds to their account.' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        amount: { type: 'number', example: 10000, description: 'Amount in cents (e.g., 10000 = $100.00)' },
        currency: { type: 'string', example: 'usd', description: 'Currency code (default: usd)' },
        description: { type: 'string', example: 'Add fund for project payments', description: 'Optional description for the transaction' },
        successUrl: { type: 'string', example: 'https://localhost:3000/payment/success', description: 'URL to redirect after successful payment' },
        cancelUrl: { type: 'string', example: 'https://localhost:3000/payment/cancel', description: 'URL to redirect after cancelled payment' },
      },
      required: ['amount', 'successUrl', 'cancelUrl'],
    },
    description: 'Fund addition request details with redirect URLs'
  })
  @ApiResponse({ status: 201, description: 'Checkout session created', schema: { example: { sessionId: 'cs_xxx', checkoutUrl: 'https://checkout.stripe.com/...' } } })
  @ApiResponse({ status: 400, description: 'Bad request - user must be a referrer' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - candidate users cannot access this endpoint' })
  async addFund(@UserDecorator() user: { id: string }, @Body() body: { amount: number, currency?: string, description?: string, successUrl: string, cancelUrl: string }) {
    const referrer = await this.userRepo.findOne({ where: { id: user.id } });

    if (!referrer || referrer.role !== UserRole.REFERRER) {
      throw new BadRequestException('User must be a referrer to add funds');
    }

    // 도메인 검증 (successUrl, cancelUrl)
    const checkDomain = (url: string) => {
      try {
        const u = new URL(url);
        const origin = u.origin;
        const isAllowed = this.allowedDomains.includes(origin);
        this.logger.log(`add-fund checkDomain url=${url} origin=${origin} allowed=${isAllowed}`);
        return isAllowed;
      } catch {
        this.logger.warn(`add-fund checkDomain parse failed url=${url}`);
        return false;
      }
    };
    if (!checkDomain(body.successUrl) || !checkDomain(body.cancelUrl)) {
      throw new BadRequestException('Invalid success_url or cancel_url domain');
    }

    // Customer ID 확인 및 생성
    let customerId = referrer.stripeCustomerId;
    if (!customerId) {
      const customer = await this.paymentService.createOrGetCustomer({
        userId: referrer.id,
        firstName: referrer.firstName,
        lastName: referrer.lastName,
        email: referrer.email,
      });
      customerId = customer.id;
      
      // User 엔티티에 stripeCustomerId 저장
      referrer.stripeCustomerId = customerId;
      await this.userRepo.save(referrer);
    }

    // Transaction 엔티티에 기록 생성
    const payment = this.transactionRepo.create({
      buyUserId: referrer.id,
      sellUserId: referrer.id, // Referrer가 자신에게 Fund 추가
      type: TransactionType.ADD_FUND,
      sellUserReceivedAmount: body.amount, // cents 단위로 저장 (센트 통일)
      platformAmount: 0, // Add Fund는 플랫폼 수수료 없음
      currency: body.currency || 'usd',
      responseId: `add_fund_${Date.now()}`,
      status: TransactionStatus.PENDING,
      description: body.description || 'Add fund to account',
      metadata: {
        userId: referrer.id,
        type: 'add_fund',
        amount: body.amount,
        currency: body.currency || 'usd',
      },
    });

    // Transaction 저장
    const savedPayment = await this.transactionRepo.save(payment);

    // Checkout Session 생성
    const session = await this.paymentService.createPayment({
      amount: body.amount,
      currency: body.currency || 'usd',
      metadata: {
        userId: referrer.id,
        type: 'add_fund',
        amount: body.amount.toString(),
        paymentId: savedPayment.id,
      },
      successUrl: body.successUrl,
      cancelUrl: body.cancelUrl,
      customerId: customerId,
      type: 'add_fund',
    });

    // Transaction에 sessionId 업데이트
    savedPayment.sessionId = session.id;
    await this.transactionRepo.save(savedPayment);

    return {
      sessionId: session.id,
      checkoutUrl: session.url,
      amount: session.amount_total,
      currency: session.currency,
      paymentId: savedPayment.id,
    };
  }

  // Get Balance API
  @Get('balance')
  @UseGuards(RolesGuard)
  @Roles(UserRole.REFERRER)
  @ApiOperation({ summary: 'Get account balance (in cents)', description: 'Returns the current platform balance of the referrer\'s account.' })
  @ApiResponse({ 
    status: 200, 
    description: 'Account balance retrieved successfully', 
    schema: { 
      example: { 
        balance: 15000,
        currency: 'usd',
        balanceInDollars: '150.00'
      } 
    } 
  })
  @ApiResponse({ status: 400, description: 'Bad request - user must be a referrer' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - candidate users cannot access this endpoint' })
  async getBalance(@UserDecorator() user: { id: string }) {
    const referrer = await this.userRepo.findOne({ where: { id: user.id } });

    if (!referrer || referrer.role !== UserRole.REFERRER) {
      throw new BadRequestException('User must be a referrer to view balance');
    }

    // Platform balance (User 엔티티의 balance) - cents 단위
    const balance = referrer.balance;

    return {
      balance, // cents 단위
      currency: 'usd',
      balanceInDollars: (balance / 100).toFixed(2), // 달러 표시용
    };
  }



  // Withdraw API
  @Post('withdraw')
  @UseGuards(RolesGuard)
  @Roles(UserRole.REFERRER)
  @ApiOperation({ summary: 'Withdraw funds from account', description: 'Allows referrer users to withdraw funds from their account to their bank account.' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        amount: { type: 'number', example: 5000, description: 'Amount in cents (e.g., 5000 = $50.00)' },
        currency: { type: 'string', example: 'usd', description: 'Currency code (default: usd)' },
        description: { type: 'string', example: 'Withdraw earnings', description: 'Optional description for the withdrawal' },
      },
      required: ['amount'],
    },
    description: 'Withdrawal request details'
  })
  @ApiResponse({ status: 201, description: 'Withdrawal initiated', schema: { example: { payoutId: 'po_xxx', amount: 5000, currency: 'usd' } } })
  @ApiResponse({ status: 400, description: 'Bad request - user must be a referrer or insufficient funds' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - candidate users cannot access this endpoint' })
  async withdraw(@UserDecorator() user: { id: string }, @Body() body: { amount: number, currency?: string, description?: string }) {
    const referrer = await this.userRepo.findOne({ where: { id: user.id } });

    if (!referrer || referrer.role !== UserRole.REFERRER) {
      throw new BadRequestException('User must be a referrer to withdraw funds');
    }

    if (!referrer.stripeAccountId || referrer.stripeOnboardingStatus !== StripeOnboardingStatus.COMPLETED) {
      throw new BadRequestException('Referrer must complete Stripe onboarding to withdraw funds');
    }

    // Processing Fee 계산
    const withdrawalCalculation = await this.calculateWithdrawalAmount(body.amount);
    const { requestedAmount, processingFee, netAmount, feePercentage } = withdrawalCalculation;

    console.log('💰 Withdrawal calculation:', {
      requestedAmount: requestedAmount / 100, // 달러로 표시
      processingFee: processingFee / 100, // 달러로 표시
      netAmount: netAmount / 100, // 달러로 표시
      feePercentage,
    });

    // 최소/최대 출금 금액 검증
    const amountValidation = await this.validateWithdrawalAmount(body.amount);
    if (!amountValidation.isValid) {
      throw new BadRequestException(amountValidation.error);
    }

    // 1. 플랫폼 잔액에서 차감 (Processing Fee 포함)
    const totalAmountToDeduct = body.amount; // 사용자가 요청한 금액
    if (referrer.balance < totalAmountToDeduct) {
      throw new BadRequestException('Insufficient balance for withdrawal');
    }

    // 2. Stripe Transfer로 Referrer의 Connect 계정으로 이체
    const transfer = await this.paymentService.withdraw(
      referrer.id,
      referrer.stripeAccountId,
      body.amount,
      body.currency || 'usd',
      body.description
    );

    // 3. 플랫폼 잔액 업데이트
    referrer.balance = referrer.balance - body.amount;
    await this.userRepo.save(referrer);

    // Transaction 엔티티에 출금 기록 생성
    const payment = this.transactionRepo.create({
      buyUserId: referrer.id,
      sellUserId: referrer.id, // Referrer가 자신에게 출금
      type: TransactionType.PAYOUT,
      sellUserReceivedAmount: netAmount, // Processing Fee 제외한 실제 수령 금액
      platformAmount: processingFee, // Processing Fee
      currency: body.currency || 'usd',
      responseId: transfer.id,
      status: TransactionStatus.PENDING, // 출금은 pending 상태로 시작
      description: body.description || 'Withdraw funds from account',
      metadata: {
        userId: referrer.id,
        type: 'withdraw',
        requestedAmount: body.amount, // 사용자가 요청한 금액
        processingFee: processingFee, // Processing Fee
        netAmount: netAmount, // 실제 수령 금액
        feePercentage: feePercentage, // 수수료 비율
        currency: body.currency || 'usd',
        transferId: transfer.id,
        stripeAccountId: referrer.stripeAccountId,
      },
    });

    await this.transactionRepo.save(payment);
    console.log('📝 Withdrawal transaction record created:', payment.id);

    return {
      transferId: transfer.id,
      amount: body.amount, // 사용자가 요청한 금액
      currency: transfer.currency,
      status: 'pending', // Transfer는 즉시 완료되므로 pending
      paymentId: payment.id, // Transaction ID도 반환
      processingFee: processingFee, // Processing Fee
      netAmount: netAmount, // 실제 수령 금액
      feePercentage: feePercentage, // 수수료 비율
      requestedAmountInDollars: (body.amount / 100).toFixed(2),
      processingFeeInDollars: (processingFee / 100).toFixed(2),
      netAmountInDollars: (netAmount / 100).toFixed(2),
    };
  }
} 