import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubscriptionPlan } from '../entities/subscription-plan.entity';
import { User } from '../entities/user.entity';
import { Transaction, TransactionType, TransactionStatus } from '../entities/transaction.entity';
import { PaymentService } from '../payments/payment.service';
import { UserRole } from '../common/enums/user-role.enum';
import { Settings } from '../entities/settings.entity';
import { ApiResponse, ApiArrayResponse } from '../common/interfaces/api-response.interface';

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    @InjectRepository(SubscriptionPlan)
    private readonly subscriptionPlanRepo: Repository<SubscriptionPlan>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,
    @InjectRepository(Settings)
    private readonly settingsRepo: Repository<Settings>,
    private readonly paymentService: PaymentService,
  ) {}

  // 모든 활성 구독 플랜 조회
  async getAllActivePlans(): Promise<ApiArrayResponse<SubscriptionPlan>> {
    const plans = await this.subscriptionPlanRepo.find({
      where: { isActive: true },
      order: { monthlyPrice: 'ASC' },
    });
    
    return {
      success: true,
      data: plans,
    };
  }

  // 특정 역할을 위한 구독 플랜 조회
  async getPlansByRole(role: UserRole): Promise<ApiArrayResponse<SubscriptionPlan>> {
    const plans = await this.subscriptionPlanRepo.find({
      where: { targetRole: role, isActive: true },
      order: { monthlyPrice: 'ASC' },
    });
    
    return {
      success: true,
      data: plans,
    };
  }

  // 특정 구독 플랜 조회
  async getPlanById(id: string): Promise<SubscriptionPlan> {
    const plan = await this.subscriptionPlanRepo.findOne({
      where: { id, isActive: true },
    });

    if (!plan) {
      throw new NotFoundException(`Subscription plan with ID ${id} not found`);
    }

    return plan;
  }

  // 구독 플랜 코드로 조회
  async getPlanByCode(code: string): Promise<SubscriptionPlan> {
    const plan = await this.subscriptionPlanRepo.findOne({
      where: { code: code as any, isActive: true },
    });

    if (!plan) {
      throw new NotFoundException(`Subscription plan with code ${code} not found`);
    }

    return plan;
  }

  // 사용자의 현재 구독 상태 조회 (단순화)
  async getUserSubscription(userId: string): Promise<ApiResponse<{
    currentPlanCode: string;
    subscriptionPurchased: boolean;
    subscriptionStartDate: Date | null;
    subscriptionEndDate: Date | null;
    subscriptionInterval: string | null;
  }>> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      select: ['id', 'currentPlanCode', 'subscriptionPurchased', 'subscriptionStartDate', 'subscriptionEndDate', 'subscriptionInterval'],
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    return {
      success: true,
      data: {
        currentPlanCode: user.currentPlanCode || 'FREE',
        subscriptionPurchased: user.subscriptionPurchased || false,
        subscriptionStartDate: user.subscriptionStartDate,
        subscriptionEndDate: user.subscriptionEndDate,
        subscriptionInterval: user.subscriptionInterval,
      },
    };
  }

  // 구독 신청을 위한 체크아웃 세션 생성
  async createSubscriptionCheckout(params: {
    userId: string;
    planCode: string;
    successUrl: string;
    cancelUrl: string;
    interval?: 'month' | 'year';
  }): Promise<{ sessionId: string; checkoutUrl: string; transactionId: string }> {
    const user = await this.userRepo.findOne({
      where: { id: params.userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${params.userId} not found`);
    }

    const plan = await this.getPlanByCode(params.planCode);
    
    if (!plan.isForRole(user.role)) {
      throw new BadRequestException(`Plan ${params.planCode} is not available for user role ${user.role}`);
    }

    // Customer ID 확인 및 생성
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await this.paymentService.createOrGetCustomer({
        userId: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      });
      customerId = customer.id;
      
      // User 엔티티에 stripeCustomerId 저장
      user.stripeCustomerId = customerId;
      await this.userRepo.save(user);
    }

    // 미리 생성된 Stripe Price ID 사용
    const priceId = params.interval === 'year' ? plan.stripeYearlyPriceId : plan.stripeMonthlyPriceId;
    
    if (!priceId) {
      throw new BadRequestException(`Price ID not found for ${params.interval || 'month'}ly ${plan.code} plan. Please contact support.`);
    }

    // 구독 체크아웃 세션 생성
    const session = await this.paymentService.createSubscriptionCheckoutSession({
      priceId: priceId,
      customerId,
      successUrl: params.successUrl,
      cancelUrl: params.cancelUrl,
      metadata: {
        userId: user.id,
        planCode: plan.code,
        targetRole: plan.targetRole,
        interval: params.interval || 'month',
      },
    });

    // Transaction 레코드 생성 (구독 체크아웃 기록)
    const transaction = this.transactionRepo.create({
      buyUserId: user.id,
      sellUserId: null, // 구독은 플랫폼이 판매자
      type: TransactionType.SUBSCRIPTION,
      sellUserReceivedAmount: 0, // 구독은 플랫폼 수수료 100%
      platformAmount: params.interval === 'year' ? plan.yearlyPrice : plan.monthlyPrice,
      currency: 'usd',
      stripeObjectId: session.id,
      responseId: session.id,
      status: TransactionStatus.PENDING,
      description: `Subscription checkout for ${plan.name} plan (${params.interval || 'month'}ly)`,
      sessionId: session.id,
      metadata: {
        userId: user.id,
        planCode: plan.code,
        targetRole: plan.targetRole,
        interval: params.interval || 'month',
        amount: params.interval === 'year' ? plan.yearlyPrice : plan.monthlyPrice,
        planName: plan.name,
        checkoutSessionId: session.id,
      },
    });

    await this.transactionRepo.save(transaction);

    this.logger.log(`Subscription checkout transaction created: ${transaction.id} for user ${user.id}`);

    return {
      sessionId: session.id,
      checkoutUrl: session.url,
      transactionId: transaction.id,
    };
  }

  // 구독 취소
  async cancelSubscription(userId: string): Promise<{ message: string }> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
    });

    if (!user || !user.stripeCustomerId) {
      throw new NotFoundException('No active subscription found');
    }

    try {
      const subscriptions = await this.paymentService.listSubscriptions({
        customerId: user.stripeCustomerId,
        limit: 1,
      });

      if (subscriptions.data.length === 0) {
        throw new NotFoundException('No active subscription found');
      }

      const subscription = subscriptions.data[0];
      await this.paymentService.cancelSubscription(subscription.id);

      // User 엔티티의 currentPlanCode를 FREE로 업데이트
      user.currentPlanCode = 'FREE';
      await this.userRepo.save(user);

      return { message: 'Subscription cancelled successfully' };
    } catch (error) {
      this.logger.error(`Error cancelling subscription: ${error.message}`);
      throw new BadRequestException(`Failed to cancel subscription: ${error.message}`);
    }
  }

  // Customer Portal로 리다이렉트 (구독 관리 페이지)
  async redirectToCustomerPortal(userId: string): Promise<{ portalUrl: string }> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    if (!user.stripeCustomerId) {
      throw new BadRequestException('No Stripe customer found. Please create a subscription first.');
    }

    try {
      // Settings에서 return URL 가져오기
      const frontendUrl = await this.getFrontendSetting('frontend_base_url');
      const returnUrl = `${frontendUrl}en/my-subscription`;
      
      const portalSession = await this.paymentService.createCustomerPortalSession({
        customerId: user.stripeCustomerId,
        returnUrl: returnUrl,
      });

      return { portalUrl: portalSession.url };
    } catch (error) {
      this.logger.error(`Error creating customer portal session: ${error.message}`);
      
      // Stripe Customer Portal 설정 관련 에러 처리
      if (error.message.includes('No configuration provided') || error.message.includes('default configuration has not been created')) {
        throw new BadRequestException(
          'Customer Portal is not configured. Please contact support to complete Stripe Customer Portal setup. ' +
          'Error: ' + error.message
        );
      }
      
      throw new BadRequestException(`Failed to create portal session: ${error.message}`);
    }
  }

  // Settings에서 값을 가져오는 헬퍼 메서드
  private async getFrontendSetting(key: string, defaultValue: string = ''): Promise<string> {
    try {
      const setting = await this.settingsRepo.findOne({ where: { key, isActive: true } });
      return setting ? setting.value : defaultValue;
    } catch (error) {
      this.logger.warn(`Failed to get frontend setting ${key}: ${error.message}, using default: ${defaultValue}`);
      return defaultValue;
    }
  }
}
