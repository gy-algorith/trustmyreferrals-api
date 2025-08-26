import { Controller, Post, Get, Req, Res, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { PaymentService } from './payment.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction } from '../entities/transaction.entity';
import { User } from '../entities/user.entity';
import Stripe from 'stripe';

import { SubscriptionPlan } from '../entities/subscription-plan.entity';

@ApiTags('Webhook')
@Controller('webhook')
export class WebhookController {
  @Get('test')
  @ApiOperation({ summary: 'Test webhook endpoint' })
  @ApiResponse({ status: 200, description: 'Webhook endpoint is working' })
  async testWebhook() {
    return { 
      message: 'Webhook endpoint is working!',
      timestamp: new Date().toISOString(),
      status: 'active'
    };
  }
  constructor(
    private readonly paymentService: PaymentService,
    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(SubscriptionPlan)
    private readonly subscriptionPlanRepo: Repository<SubscriptionPlan>,
  ) {}

  @Post('stripe')
  @ApiOperation({ summary: 'Stripe webhook handler', description: 'Handles Stripe webhook events for payment processing' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid webhook signature or event' })
  async handleStripeWebhook(@Req() req: Request, @Res() res: Response) {
    console.log('🔔 Webhook received:', {
      method: req.method,
      url: req.url,
      headers: {
        'stripe-signature': req.headers['stripe-signature'] ? '***' : 'missing',
        'content-type': req.headers['content-type'],
        'user-agent': req.headers['user-agent'],
        'host': req.headers.host,
        'origin': req.headers.origin,
      },
      bodySize: req.body ? JSON.stringify(req.body).length : 0,
      bodyPreview: req.body ? req.body.substring(0, 200) + '...' : 'missing',
      timestamp: new Date().toISOString(),
      remoteAddress: req.socket.remoteAddress,
    });

    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    console.log('🔑 Webhook configuration:', {
      hasSignature: !!sig,
      signatureLength: sig ? sig.length : 0,
      hasEndpointSecret: !!endpointSecret,
      endpointSecretLength: endpointSecret ? endpointSecret.length : 0,
    });

    if (!endpointSecret) {
      console.error('❌ STRIPE_WEBHOOK_SECRET not configured');
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'Webhook secret not configured' });
    }

    let event: Stripe.Event;

    try {
      console.log('🔐 Verifying webhook signature...');
      // Webhook signature 검증
      event = await this.paymentService.verifyWebhookSignature(req.body, sig as string, endpointSecret);
      console.log('✅ Webhook signature verified successfully');
    } catch (err) {
      console.error('❌ Webhook signature verification failed:', {
        error: err.message,
        errorType: err.constructor.name,
        stack: err.stack,
      });
      return res.status(HttpStatus.BAD_REQUEST).json({ error: 'Invalid signature' });
    }

    console.log('📋 Webhook event details:', {
      id: event.id,
      type: event.type,
      created: new Date(event.created * 1000).toISOString(),
      livemode: event.livemode,
      apiVersion: event.api_version,
      objectType: event.data?.object?.object || 'unknown',
      objectId: (event.data?.object as any)?.id || 'unknown',
    });

    try {
      console.log('🔄 Processing webhook event:', event.type);
      
      // 이벤트 타입별 처리
      switch (event.type) {
        case 'checkout.session.completed':
          console.log('💳 Processing checkout.session.completed event');
          await this.handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
          break;
        
        case 'payment_intent.succeeded':
          console.log('✅ Processing payment_intent.succeeded event');
          await this.handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
          break;
        
        case 'customer.subscription.created':
          console.log('📅 Processing customer.subscription.created event');
          await this.handleSubscriptionCreated(event.data.object as Stripe.Subscription);
          break;
        
        case 'customer.subscription.updated':
          console.log('📝 Processing customer.subscription.updated event');
          await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
          break;
        
        case 'customer.subscription.deleted':
          console.log('🗑️ Processing customer.subscription.deleted event');
          await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;
        
        case 'invoice.payment_succeeded':
          console.log('🧾 Processing invoice.payment_succeeded event');
          await this.handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
          break;
        
        case 'payment_intent.payment_failed':
          console.log('❌ Processing payment_intent.payment_failed event');
          await this.handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
          break;
        
        case 'account.updated':
          console.log('🔗 Processing account.updated event');
          await this.handleAccountUpdated(event.data.object as Stripe.Account);
          break;
        
        case 'payout.paid':
          console.log('💰 Processing payout.paid event');
          await this.handlePayoutPaid(event.data.object as Stripe.Payout);
          break;
        
        case 'payout.failed':
          console.log('❌ Processing payout.failed event');
          await this.handlePayoutFailed(event.data.object as Stripe.Payout);
          break;
        
        case 'transfer.created':
          console.log('📤 Processing transfer.created event');
          await this.handleTransferCreated(event.data.object as any);
          break;
        
        default:
          console.log(`⚠️ Unhandled event type: ${event.type}`, {
            eventData: JSON.stringify(event.data, null, 2).substring(0, 500) + '...',
          });
      }

      console.log('🎉 Webhook event processed successfully');
      res.json({ 
        received: true, 
        eventId: event.id,
        eventType: event.type,
        processedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('💥 Webhook processing error:', {
        error: error.message,
        errorType: error.constructor.name,
        stack: error.stack,
        eventId: event.id,
        eventType: event.type,
      });
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ 
        error: 'Webhook processing failed',
        eventId: event.id,
        eventType: event.type,
      });
    }
  }

  private async handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
    console.log('💳 Processing checkout.session.completed:', {
      sessionId: session.id,
      paymentStatus: session.payment_status,
      paymentIntent: session.payment_intent,
      amountTotal: session.amount_total,
      currency: session.currency,
      customerEmail: session.customer_details?.email,
      metadata: session.metadata,
    });

    // Payment 엔티티 찾기
    let payment = await this.transactionRepo.findOne({
      where: { sessionId: session.id }
    });

    if (!payment) {
      console.error('❌ Payment not found for session:', session.id);
      return;
    }

    // subscription 타입인 경우 metadata에 사용자 정보 저장
    if (payment.type === 'subscription' && session.metadata?.userId) {
      payment.metadata = {
        ...payment.metadata,
        userId: session.metadata.userId,
        planCode: session.metadata.planCode,
        targetRole: session.metadata.targetRole,
        interval: session.metadata.interval,
      };
      
      await this.transactionRepo.save(payment);
      console.log('✅ Updated transaction metadata with session data:', {
        userId: session.metadata.userId,
        planCode: session.metadata.planCode,
        targetRole: session.metadata.targetRole,
      });
    }

    console.log('📝 Found payment record:', {
      paymentId: payment.id,
      type: payment.type,
      amount: payment.sellUserReceivedAmount,
      status: payment.status,
    });

    // 결제 상태 업데이트
    payment.status = 'succeeded' as any;
    // responseId는 null이 될 수 없으므로 session.id를 사용
    payment.responseId = session.payment_intent as string || session.id;
    payment.metadata = {
      ...payment.metadata,
      stripeSessionId: session.id,
      stripePaymentIntent: session.payment_intent,
      processedAt: new Date().toISOString(),
    };

          await this.transactionRepo.save(payment);
      console.log('✅ Transaction status updated to succeeded');

    // Add Fund인 경우 balance 업데이트 및 Connect Account로 이체
    if (payment.type === 'add_fund' && payment.buyUserId === payment.sellUserId) {
      console.log('💰 Processing add fund success for payment:', payment.id);
      await this.processAddFundSuccess(payment);
    } else {
      console.log('ℹ️ Payment is not add_fund type or self-payment, skipping balance update');
    }
  }

  private async handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
    console.log('Processing payment_intent.succeeded:', paymentIntent.id);

    // Transaction 엔티티 찾기 (responseId로)
    let payment = await this.transactionRepo.findOne({
      where: { responseId: paymentIntent.id }
    });

    // responseId로 찾지 못한 경우, 가장 최근의 subscription pending transaction 찾기
    if (!payment) {
      console.log('Transaction not found by responseId, trying alternative search...');
      
      // 가장 최근의 subscription pending transaction 찾기
      payment = await this.transactionRepo.findOne({
        where: { 
          type: 'subscription' as any,
          status: 'pending' as any
        },
        order: { createdAt: 'DESC' }
      });
      
      if (payment) {
        console.log('Found subscription transaction by type and status:', payment.id);
        // responseId 업데이트
        payment.responseId = paymentIntent.id;
        
        // 결제 상태 업데이트
        payment.status = 'succeeded' as any;
        payment.metadata = {
          ...payment.metadata,
          stripePaymentIntent: paymentIntent.id,
          processedAt: new Date().toISOString(),
        };

        await this.transactionRepo.save(payment);
        console.log('✅ Transaction status updated to succeeded for payment intent:', paymentIntent.id);
      }
    } else {
      // 결제 상태 업데이트
      payment.status = 'succeeded' as any;
      payment.metadata = {
        ...payment.metadata,
        stripePaymentIntent: paymentIntent.id,
        processedAt: new Date().toISOString(),
      };

      await this.transactionRepo.save(payment);
      console.log('✅ Transaction status updated to succeeded for payment intent:', paymentIntent.id);
    }

    if (!payment) {
      console.error('Transaction not found for payment intent:', paymentIntent.id);
      return;
    }

    // 결제 상태 업데이트
    payment.status = 'succeeded' as any;
    payment.metadata = {
      ...payment.metadata,
      stripePaymentIntent: paymentIntent.id,
      processedAt: new Date().toISOString(),
    };

    await this.transactionRepo.save(payment);
    console.log('✅ Transaction status updated to succeeded for payment intent:', paymentIntent.id);

    // Add Fund인 경우 balance 업데이트 및 Connect Account로 이체
    if (payment.type === 'add_fund' && payment.buyUserId === payment.sellUserId) {
      await this.processAddFundSuccess(payment);
    }
  }

  private async handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
    console.log('Processing payment_intent.payment_failed:', paymentIntent.id);

    // Transaction 엔티티 찾기 (responseId로)
    const payment = await this.transactionRepo.findOne({
      where: { responseId: paymentIntent.id }
    });

    if (!payment) {
      console.error('Transaction not found for payment intent:', paymentIntent.id);
      return;
    }

    // 결제 상태 업데이트
    payment.status = 'failed' as any;
    payment.metadata = {
      ...payment.metadata,
      stripePaymentIntent: paymentIntent.id,
      failureReason: paymentIntent.last_payment_error?.message || 'Payment failed',
      processedAt: new Date().toISOString(),
    };

    await this.transactionRepo.save(payment);
  }

  private async processAddFundSuccess(payment: Transaction) {
    console.log('🚀 Starting add fund success processing for payment:', payment.id);
    
    try {
      const user = await this.userRepo.findOne({
        where: { id: payment.buyUserId }
      });

      if (!user) {
        console.error('❌ User not found for payment:', {
          paymentId: payment.id,
          buyUserId: payment.buyUserId,
        });
        return;
      }

      // Add Fund는 stripeAccountId와 관계없이 balance 업데이트
      console.log('💰 Processing add fund balance update:', {
        userId: user.id,
        email: user.email,
        hasStripeAccountId: !!user.stripeAccountId,
      });
      
      // 1. User balance 업데이트 (Add Fund의 핵심 기능)
      const amountInDollars = parseFloat(payment.sellUserReceivedAmount.toString());
      const oldBalance = parseFloat(user.balance.toString());
      user.balance = (oldBalance + amountInDollars);
      
      console.log('💰 Updating user balance:', {
        oldBalance: oldBalance.toFixed(2),
        addAmount: amountInDollars.toFixed(2),
        newBalance: user.balance.toFixed(2),
      });
      
      await this.userRepo.save(user);
      console.log('✅ User balance updated successfully');

      // 2. stripeAccountId가 있는 경우에만 Transfer (선택사항)
      if (user.stripeAccountId) {
        console.log('🔄 Initiating transfer to connected account:', {
          amount: amountInDollars,
          currency: payment.currency,
          destination: user.stripeAccountId,
        });

        try {
          const transfer = await this.paymentService.transferToConnectedAccount({
            amount: payment.sellUserReceivedAmount * 100, // dollars를 cents로 변환
            currency: payment.currency,
            destination: user.stripeAccountId,
            description: `Add fund transfer for payment ${payment.id}`,
            metadata: {
              paymentId: payment.id,
              userId: user.id,
              type: 'add_fund_transfer',
            },
          });

          console.log('🎉 Transfer completed successfully:', {
            transferId: transfer.id,
            amount: transfer.amount,
            currency: transfer.currency,
            destination: transfer.destination,
            status: (transfer as any).status || 'unknown',
          });
        } catch (transferError) {
          console.error('⚠️ Transfer failed but balance was updated:', {
            error: transferError.message,
            paymentId: payment.id,
          });
          // Transfer 실패해도 balance는 이미 업데이트됨
        }
      } else {
        console.log('ℹ️ No stripeAccountId, skipping transfer (balance updated successfully)');
      }

    } catch (error) {
      console.error('💥 Error processing add fund success:', {
        error: error.message,
        errorType: error.constructor.name,
        stack: error.stack,
        paymentId: payment.id,
        buyUserId: payment.buyUserId,
      });
      // 에러가 발생해도 payment는 이미 succeeded 상태이므로 롤백하지 않음
    }
  }

  private async handleAccountUpdated(account: Stripe.Account) {
    console.log('🔗 Processing account update:', {
      accountId: account.id,
      detailsSubmitted: account.details_submitted,
      payoutsEnabled: account.payouts_enabled,
      chargesEnabled: account.charges_enabled,
      requirementsDisabled: account.requirements?.disabled_reason,
      requirementsPending: account.requirements?.pending_verification?.length || 0,
      requirementsOverdue: account.requirements?.past_due?.length || 0,
    });

    try {
      // 해당 account를 가진 user 찾기
      const user = await this.userRepo.findOne({
        where: { stripeAccountId: account.id }
      });

      if (!user) {
        console.log('⚠️ No user found for account:', account.id);
        return;
      }

      // 더 정확한 온보딩 상태 판단
      let newStatus: string;
      let statusReason = '';

      // 계정이 비활성화된 경우
      if (account.requirements?.disabled_reason) {
        newStatus = 'failed';
        statusReason = `Disabled: ${account.requirements.disabled_reason}`;
      }
      // 완전히 성공한 경우
      else if (account.details_submitted && account.payouts_enabled && account.charges_enabled) {
        newStatus = 'completed';
        statusReason = 'All capabilities enabled';
      }
      // 정보는 제출했지만 아직 검증 중인 경우
      else if (account.details_submitted && !account.payouts_enabled) {
        newStatus = 'in_progress';
        statusReason = 'Details submitted, awaiting verification';
      }
      // 아직 정보를 완전히 제출하지 않은 경우
      else if (!account.details_submitted) {
        newStatus = 'in_progress';
        statusReason = 'Details not fully submitted';
      }
      // 기타 상태
      else {
        newStatus = 'in_progress';
        statusReason = 'Processing';
      }

      console.log('📝 Updating user onboarding status:', {
        userId: user.id,
        email: user.email,
        oldStatus: user.stripeOnboardingStatus,
        newStatus: newStatus,
        statusReason: statusReason,
        pendingRequirements: account.requirements?.pending_verification || [],
        pastDueRequirements: account.requirements?.past_due || [],
      });

      // User 엔티티에 stripeOnboardingStatus 필드가 있는지 확인 필요
      // 현재 User 엔티티에 이 필드가 없다면 추가해야 함
      if ('stripeOnboardingStatus' in user) {
        (user as any).stripeOnboardingStatus = newStatus;
        await this.userRepo.save(user);
        console.log('✅ User onboarding status updated successfully');
        
        // 실패한 경우 추가 로깅
        if (newStatus === 'failed') {
          console.error('❌ Account onboarding failed:', {
            userId: user.id,
            accountId: account.id,
            reason: statusReason,
            disabledReason: account.requirements?.disabled_reason,
            pastDue: account.requirements?.past_due,
          });
        }
      } else {
        console.log('⚠️ stripeOnboardingStatus field not found in User entity');
      }

    } catch (error) {
      console.error('💥 Error processing account update:', {
        error: error.message,
        errorType: error.constructor.name,
        accountId: account.id,
      });
    }
  }

  private async handlePayoutPaid(payout: Stripe.Payout) {
    console.log('💰 Processing payout.paid:', {
      payoutId: payout.id,
      amount: payout.amount,
      currency: payout.currency,
      status: payout.status,
      arrivalDate: payout.arrival_date,
    });

    try {
      // 해당 payout을 가진 transaction 찾기
      const payment = await this.transactionRepo.findOne({
        where: { responseId: payout.id }
      });

      if (!payment) {
        console.log('⚠️ No transaction found for payout:', payout.id);
        return;
      }

      console.log('📝 Found transaction record for payout:', {
        paymentId: payment.id,
        type: payment.type,
        amount: payment.sellUserReceivedAmount,
        status: payment.status,
      });

      // Transaction 상태를 PAID로 업데이트
      payment.status = 'paid' as any;
      payment.metadata = {
        ...payment.metadata,
        stripePayoutId: payout.id,
        processedAt: new Date().toISOString(),
        arrivalDate: payout.arrival_date,
      };

      await this.transactionRepo.save(payment);
      console.log('✅ Payment status updated to paid for payout:', payout.id);

    } catch (error) {
      console.error('💥 Error processing payout.paid:', {
        error: error.message,
        errorType: error.constructor.name,
        stack: error.stack,
        payoutId: payout.id,
      });
    }
  }

  private async handlePayoutFailed(payout: Stripe.Payout) {
          console.log('❌ Processing payout.failed:', {
        payoutId: payout.id,
        amount: payout.amount,
        currency: payout.currency,
        status: payout.status,
        failureCode: payout.failure_code,
        failureMessage: payout.failure_message,
      });

    try {
      // 해당 payout을 가진 transaction 찾기
      const payment = await this.transactionRepo.findOne({
        where: { responseId: payout.id }
      });

      if (!payment) {
        console.log('⚠️ No transaction found for payout:', payout.id);
        return;
      }

      console.log('📝 Found transaction record for failed payout:', {
        paymentId: payment.id,
        type: payment.type,
        amount: payment.sellUserReceivedAmount,
        status: payment.status,
      });

      // Transaction 상태를 FAILED로 업데이트
      payment.status = 'failed' as any;
      payment.metadata = {
        ...payment.metadata,
        stripePayoutId: payout.id,
        failureCode: payout.failure_code,
        failureMessage: payout.failure_message,
        processedAt: new Date().toISOString(),
      };

      await this.transactionRepo.save(payment);
      console.log('❌ Payment status updated to failed for payout:', payout.id);

    } catch (error) {
      console.error('💥 Error processing payout.failed:', {
        error: error.message,
        errorType: error.constructor.name,
        stack: error.stack,
        payoutId: payout.id,
      });
    }
  }

  private async handleTransferCreated(transfer: any) {
    console.log('📤 Processing transfer.created:', {
      transferId: transfer.id,
      amount: transfer.amount,
      currency: transfer.currency,
      destination: transfer.destination,
      status: 'created',
    });

    try {
      // Transfer 생성 = 즉시 성공 (별도의 paid 이벤트 없음)
      const transaction = await this.transactionRepo.findOne({
        where: { responseId: transfer.id }
      });

      if (!transaction) {
        console.log('⚠️ No transaction found for transfer:', transfer.id);
        return;
      }

      console.log('📝 Found transaction record for transfer:', {
        transactionId: transaction.id,
        type: transaction.type,
        amount: transaction.sellUserReceivedAmount,
        status: transaction.status,
      });

      // Transaction 상태를 SUCCEEDED로 업데이트 (Transfer는 생성 즉시 성공)
      transaction.status = 'succeeded' as any;
      transaction.metadata = {
        ...transaction.metadata,
        stripeTransferId: transfer.id,
        processedAt: new Date().toISOString(),
        destination: transfer.destination,
      };

      await this.transactionRepo.save(transaction);
      console.log('✅ Transaction status updated to succeeded for transfer:', transfer.id);

    } catch (error) {
      console.error('💥 Error processing transfer.created:', {
        error: error.message,
        errorType: error.constructor.name,
        stack: error.stack,
        transferId: transfer.id,
      });
    }
  }

  private async handleSubscriptionCreated(subscription: Stripe.Subscription) {
    console.log('📅 Processing subscription.created:', {
      subscriptionId: subscription.id,
      customerId: subscription.customer,
      status: subscription.status,
      currentPeriodStart: (subscription as any).current_period_start ? new Date((subscription as any).current_period_start * 1000).toISOString() : 'N/A',
      currentPeriodEnd: (subscription as any).current_period_end ? new Date((subscription as any).current_period_end * 1000).toISOString() : 'N/A',
      metadata: subscription.metadata,
    });

    try {
      // 구독 생성 시 사용자의 currentPlanCode 업데이트
      // 메타데이터가 없을 경우, checkout.session.completed에서 저장된 메타데이터 사용
      let planCode = subscription.metadata?.planCode;
      let userId = subscription.metadata?.userId;

      if (!planCode || !userId) {
        console.log('⚠️ Subscription metadata is empty, trying to find from checkout session...');
        
        // 가장 최근의 subscription transaction 찾기 (pending 또는 succeeded)
        let transaction = await this.transactionRepo.findOne({
          where: { 
            type: 'subscription' as any
          },
          order: { createdAt: 'DESC' }
        });

        if (transaction && transaction.metadata) {
          planCode = transaction.metadata.planCode;
          userId = transaction.metadata.userId;
          console.log('✅ Found metadata from transaction:', { planCode, userId });
        } else {
          console.log('⚠️ No transaction found with metadata for subscription:', subscription.id);
        }
      }

      if (planCode && userId) {
        const user = await this.userRepo.findOne({
          where: { id: userId }
        });

        if (user) {
          // 플랜 정보 가져오기
          const plan = await this.subscriptionPlanRepo.findOne({
            where: { code: planCode as any }
          });

          if (!plan) {
            console.error('❌ Subscription plan not found:', planCode);
            return;
          }

          // 구독 상태 관련 필드들 업데이트
          user.currentPlanCode = planCode;
          user.stripeSubscriptionId = subscription.id;
          
          // 구독 구매 여부 업데이트
          user.subscriptionPurchased = subscription.status === 'active';
          
          // timestamp 안전하게 변환
          const currentPeriodStart = (subscription as any).current_period_start;
          const currentPeriodEnd = (subscription as any).current_period_end;
          
          if (currentPeriodStart && typeof currentPeriodStart === 'number') {
            user.subscriptionStartDate = new Date(currentPeriodStart * 1000);
          }
          
          if (currentPeriodEnd && typeof currentPeriodEnd === 'number') {
            user.subscriptionEndDate = new Date(currentPeriodEnd * 1000);
            user.nextBillingDate = new Date(currentPeriodEnd * 1000);
          }
          
          user.subscriptionInterval = (subscription as any).items?.data?.[0]?.plan?.interval || 'month';
          
          // Referrer인 경우 candidateCap 업데이트
          if (user.role === 'referrer' && plan.acquiredCandidateCap !== undefined) {
            user.candidateCap = plan.acquiredCandidateCap;
            console.log('✅ Updated referrer candidateCap:', {
              userId: user.id,
              oldCandidateCap: user.candidateCap,
              newCandidateCap: plan.acquiredCandidateCap,
              planCode: planCode,
            });
          }
          
          await this.userRepo.save(user);
          console.log('✅ User subscription fields updated:', {
            userId: user.id,
            newPlanCode: planCode,
            targetRole: plan?.targetRole || 'unknown',
            subscriptionId: user.stripeSubscriptionId,
            subscriptionPurchased: user.subscriptionPurchased,
            candidateCap: user.candidateCap,
            subscriptionStartDate: user.subscriptionStartDate,
            subscriptionEndDate: user.subscriptionEndDate,
            nextBillingDate: user.nextBillingDate,
            subscriptionInterval: user.subscriptionInterval,
          });
        }
      } else {
        console.log('⚠️ Could not determine plan code or user ID for subscription:', subscription.id);
      }

      // Transaction 상태를 SUCCEEDED로 업데이트
      const transaction = await this.transactionRepo.findOne({
        where: { 
          buyUserId: subscription.metadata?.userId,
          type: 'subscription' as any,
          status: 'pending' as any
        },
        order: { createdAt: 'DESC' }
      });

      if (transaction) {
        transaction.status = 'succeeded' as any;
        transaction.responseId = subscription.id;
        transaction.metadata = {
          ...transaction.metadata,
          stripeSubscriptionId: subscription.id,
          stripeCustomerId: subscription.customer,
          processedAt: new Date().toISOString(),
        };

        await this.transactionRepo.save(transaction);
        console.log('✅ Subscription transaction updated:', {
          transactionId: transaction.id,
          subscriptionId: subscription.id,
        });

        // 구독에 메타데이터 업데이트
        try {
          await this.paymentService.updateSubscription(subscription.id, {
            metadata: {
              userId: transaction.metadata?.userId,
              planCode: transaction.metadata?.planCode,
              targetRole: transaction.metadata?.targetRole,
              interval: transaction.metadata?.interval,
            }
          });
          console.log('✅ Subscription metadata updated with transaction data');
        } catch (error) {
          console.error('⚠️ Failed to update subscription metadata:', error.message);
        }
      } else {
        console.log('⚠️ No pending subscription transaction found for user:', subscription.metadata?.userId);
      }

    } catch (error) {
      console.error('💥 Error processing subscription.created:', {
        error: error.message,
        errorType: error.constructor.name,
        stack: error.stack,
        subscriptionId: subscription.id,
      });
    }
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    console.log('📝 Processing subscription.updated:', {
      subscriptionId: subscription.id,
      customerId: subscription.customer,
      status: subscription.status,
      metadata: subscription.metadata,
    });

    try {
      // 구독 업데이트 시 사용자의 currentPlanCode 업데이트
      if (subscription.metadata?.planCode && subscription.metadata?.userId) {
        const user = await this.userRepo.findOne({
          where: { id: subscription.metadata.userId }
        });

        if (user) {
          // 플랜 정보 가져오기
          const plan = await this.subscriptionPlanRepo.findOne({
            where: { code: subscription.metadata.planCode as any }
          });

          if (plan) {
            user.currentPlanCode = subscription.metadata.planCode;
            
            // Referrer인 경우 candidateCap 업데이트
            if (user.role === 'referrer' && plan.acquiredCandidateCap !== undefined) {
              user.candidateCap = plan.acquiredCandidateCap;
              console.log('✅ Updated referrer candidateCap from subscription.updated:', {
                userId: user.id,
                newCandidateCap: plan.acquiredCandidateCap,
                planCode: subscription.metadata.planCode,
              });
            }
          }
          
          await this.userRepo.save(user);
          console.log('✅ User plan updated from subscription.updated:', {
            userId: user.id,
            newPlanCode: subscription.metadata.planCode,
            candidateCap: user.candidateCap,
          });
        }
      } else {
        console.log('⚠️ Subscription metadata incomplete, skipping user update');
      }

    } catch (error) {
      console.error('💥 Error processing subscription.updated:', {
        error: error.message,
        errorType: error.constructor.name,
        stack: error.stack,
        subscriptionId: subscription.id,
      });
    }
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    console.log('🗑️ Processing subscription.deleted:', {
      subscriptionId: subscription.id,
      customerId: subscription.customer,
      status: subscription.status,
      metadata: subscription.metadata,
    });

    try {
      // 구독 삭제 시 사용자의 currentPlanCode를 기본값으로 리셋
      if (subscription.metadata?.userId) {
        const user = await this.userRepo.findOne({
          where: { id: subscription.metadata.userId }
        });

        if (user) {
          // 사용자 역할에 따라 기본 플랜 설정
          const defaultPlan = user.role === 'referrer' ? 'FREE' : 'STANDARD';
          user.currentPlanCode = defaultPlan;
          
          // Referrer인 경우 candidateCap을 기본값으로 리셋
          if (user.role === 'referrer') {
            const defaultPlanEntity = await this.subscriptionPlanRepo.findOne({
              where: { code: defaultPlan as any, isDefault: true }
            });
            
            if (defaultPlanEntity && defaultPlanEntity.acquiredCandidateCap !== undefined) {
              user.candidateCap = defaultPlanEntity.acquiredCandidateCap;
              console.log('✅ Reset referrer candidateCap to default:', {
                userId: user.id,
                newCandidateCap: defaultPlanEntity.acquiredCandidateCap,
                planCode: defaultPlan,
              });
            }
          }
          
          // 구독 관련 필드들 리셋
          user.subscriptionPurchased = false;
          user.subscriptionStartDate = null;
          user.subscriptionEndDate = null;
          user.nextBillingDate = null;
          user.subscriptionInterval = null;
          user.stripeSubscriptionId = null;
          
          await this.userRepo.save(user);
          console.log('✅ User plan and subscription fields reset to default:', {
            userId: user.id,
            newPlanCode: defaultPlan,
            candidateCap: user.candidateCap,
            subscriptionPurchased: user.subscriptionPurchased,
          });
        }
      }

      // Transaction 상태를 FAILED로 업데이트 (구독 취소)
      const transaction = await this.transactionRepo.findOne({
        where: { 
          buyUserId: subscription.metadata?.userId,
          type: 'subscription' as any,
          status: 'succeeded' as any
        },
        order: { createdAt: 'DESC' }
      });

      if (transaction) {
        transaction.status = 'failed' as any;
        transaction.metadata = {
          ...transaction.metadata,
          stripeSubscriptionId: subscription.id,
          stripeCustomerId: subscription.customer,
          cancelledAt: new Date().toISOString(),
          reason: 'subscription_cancelled',
        };

        await this.transactionRepo.save(transaction);
        console.log('❌ Subscription transaction marked as cancelled:', {
          transactionId: transaction.id,
          subscriptionId: subscription.id,
        });
      } else {
        console.log('⚠️ No active subscription transaction found for user:', subscription.metadata?.userId);
      }

    } catch (error) {
      console.error('💥 Error processing subscription.deleted:', {
        error: error.message,
        errorType: error.constructor.name,
        stack: error.stack,
        subscriptionId: subscription.id,
      });
    }
  }

  private async handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
    console.log('🧾 Processing invoice.payment_succeeded:', {
      invoiceId: invoice.id,
      customerId: invoice.customer,
      subscriptionId: (invoice as any).subscription,
      amountPaid: invoice.amount_paid,
      currency: invoice.currency,
      status: invoice.status,
    });

    try {
      // 인보이스 결제 성공 시 구독 관련 Transaction 업데이트
      const subscriptionId = (invoice as any).subscription;
      
      if (subscriptionId) {
        console.log('✅ Found subscription ID in invoice:', subscriptionId);
        
        // subscription ID로 transaction 찾기
        const transaction = await this.transactionRepo.findOne({
          where: { 
            type: 'subscription' as any,
            status: 'succeeded' as any
          },
          order: { createdAt: 'DESC' }
        });

        if (transaction) {
          transaction.metadata = {
            ...transaction.metadata,
            stripeInvoiceId: invoice.id,
            stripeSubscriptionId: subscriptionId,
            amountPaid: invoice.amount_paid,
            currency: invoice.currency,
            invoiceStatus: invoice.status,
            processedAt: new Date().toISOString(),
          };

          await this.transactionRepo.save(transaction);
          console.log('✅ Invoice payment recorded for subscription:', {
            transactionId: transaction.id,
            invoiceId: invoice.id,
            subscriptionId: subscriptionId,
          });
        } else {
          console.log('⚠️ No subscription transaction found for invoice:', invoice.id);
        }
      } else {
        console.log('⚠️ No subscription ID found in invoice:', invoice.id);
      }

    } catch (error) {
      console.error('💥 Error processing invoice.payment_succeeded:', {
        error: error.message,
        errorType: error.constructor.name,
        stack: error.stack,
        invoiceId: invoice.id,
      });
    }
  }

}
