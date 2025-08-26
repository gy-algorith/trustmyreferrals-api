import { Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';

@Injectable()
export class PaymentService {
  public stripe: Stripe;
  private readonly logger = new Logger(PaymentService.name);
  
  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-07-30.basil',
    });
  }

  // Stripe Connect 계정 생성 (Referrer 온보딩용)
  async createConnectAccount(params: {
    email: string;
    userId: string;
  }): Promise<string> {
    const account = await this.stripe.accounts.create({
      type: 'express',
      country: 'US',
      email: params.email,
      capabilities: {
        transfers: { requested: true },
      },
      business_type: 'individual',
      metadata: {
        referrer_id: params.userId,
        created_at: new Date().toISOString(),
      },
    });
    
    this.logger.log(`Created Stripe Connect account: ${account.id} for user: ${params.userId}`);
    return account.id;
  }

  // Stripe Connect 온보딩 링크 생성
  async createAccountLink(accountId: string): Promise<string> {
    const link = await this.stripe.accountLinks.create({
      account: accountId,
      refresh_url: 'http://localhost:3000/my-page?connect=fail',
      return_url: 'http://localhost:3000/my-page?connect=success',
      type: 'account_onboarding',
    });
    return link.url;
  }

  // 커스텀 URL로 Stripe Connect 온보딩 링크 생성
  async createAccountLinkWithCustomUrls(accountId: string, returnUrl: string, refreshUrl: string): Promise<string> {
    const link = await this.stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
    });
    return link.url;
  }

  // Stripe Connect 계정 정보 조회
  async getAccount(accountId: string): Promise<Stripe.Account> {
    return this.stripe.accounts.retrieve(accountId);
  }

  // 일반 결제 세션 생성 (월렛 충전 등)
  async createPayment(params: {
    amount: number;
    currency: string;
    metadata: Record<string, string>;
    successUrl: string;
    cancelUrl: string;
    customerId?: string;
    type: 'add_fund' | 'subscription' | 'referral';
  }) {
    this.logger.log(`createPayment: Creating payment for type ${params.type}, amount ${params.amount}`);

    const session = await this.stripe.checkout.sessions.create({
      customer: params.customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: params.currency,
            product_data: {
              name: this.getProductName(params.type),
            },
            unit_amount: params.amount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      metadata: {
        ...params.metadata,
        type: params.type,
      },
    });

    return session;
  }

  // 상품명 생성 헬퍼 메서드
  private getProductName(type: string): string {
    switch (type) {
      case 'add_fund':
        return 'Account Balance Top-up';
      case 'subscription':
        return 'Subscription Payment';
      case 'referral':
        return 'Referral Fee';
      default:
        return 'Payment';
    }
  }

  // Stripe Customer 생성 또는 조회
  async createOrGetCustomer(params: {
    userId: string;
    firstName: string;
    lastName: string;
    email: string;
  }) {
    this.logger.log(`createOrGetCustomer: Creating or getting customer for user ${params.userId}`);

    const customer = await this.stripe.customers.create({
      name: `${params.firstName} ${params.lastName}`,
      email: params.email,
      metadata: {
        userId: params.userId,
        type: 'referrer',
        createdAt: new Date().toISOString(),
      },
    });

    return customer;
  }

  // Webhook 서명 검증
  async verifyWebhookSignature(payload: any, signature: string, secret: string): Promise<Stripe.Event> {
    return this.stripe.webhooks.constructEvent(payload, signature, secret);
  }

  // Connected Account로 자금 이체
  async transferToConnectedAccount(params: {
    amount: number;
    currency: string;
    destination: string;
    description: string;
    metadata: Record<string, string>;
  }) {
    this.logger.log(`transferToConnectedAccount: Transferring ${params.amount} ${params.currency} to ${params.destination}`);

    const transfer = await this.stripe.transfers.create({
      amount: params.amount,
      currency: params.currency,
      destination: params.destination,
      description: params.description,
      metadata: params.metadata,
    });

    this.logger.log(`Transfer created: ${transfer.id}`);
    return transfer;
  }

  // 출금 처리 (플랫폼 잔액에서 Connected Account로 이체)
  async withdraw(
    userId: string,
    stripeAccountId: string,
    amount: number,
    currency: string = 'usd',
    description?: string,
  ): Promise<Stripe.Transfer> {
    const transfer = await this.stripe.transfers.create({
      amount: amount,
      currency: currency,
      destination: stripeAccountId,
      transfer_group: `WITHDRAWAL_${Date.now()}`,
      metadata: {
        userId: userId,
        type: 'withdrawal',
        amount: amount,
        currency: currency,
        description: description || 'Withdrawal from platform balance',
      },
    });

    this.logger.log(`Transfer created for withdrawal: ${transfer.id}, amount: ${amount} ${currency}`);
    return transfer;
  }

  // 구독 관련 메서드들
  async createSubscriptionCheckoutSession(params: {
    priceId: string;
    customerId: string;
    successUrl: string;
    cancelUrl: string;
    metadata: Record<string, string>;
  }): Promise<Stripe.Checkout.Session> {
    this.logger.log(`createSubscriptionCheckoutSession: Creating subscription for customer ${params.customerId}`);

    const session = await this.stripe.checkout.sessions.create({
      customer: params.customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: params.priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      metadata: params.metadata,
    });

    this.logger.log(`Subscription checkout session created: ${session.id}`);
    return session;
  }

  // 구독 정보 조회
  async getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    return this.stripe.subscriptions.retrieve(subscriptionId);
  }

  // 구독 취소
  async cancelSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    this.logger.log(`cancelSubscription: Cancelling subscription ${subscriptionId}`);

    const subscription = await this.stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });

    this.logger.log(`Subscription cancelled: ${subscriptionId}`);
    return subscription;
  }

  // 구독 업데이트
  async updateSubscription(subscriptionId: string, params: {
    priceId?: string;
    metadata?: Record<string, string>;
  }): Promise<Stripe.Subscription> {
    this.logger.log(`updateSubscription: Updating subscription ${subscriptionId}`);

    const updateData: any = {};
    if (params.priceId) {
      updateData.items = [{ price: params.priceId, quantity: 1 }];
    }
    if (params.metadata) {
      updateData.metadata = params.metadata;
    }

    const subscription = await this.stripe.subscriptions.update(subscriptionId, updateData);
    this.logger.log(`Subscription updated: ${subscriptionId}`);
    return subscription;
  }

  // 구독 목록 조회
  async listSubscriptions(params: {
    customerId: string;
    limit?: number;
    startingAfter?: string;
  }): Promise<Stripe.ApiList<Stripe.Subscription>> {
    return this.stripe.subscriptions.list({
      customer: params.customerId,
      limit: params.limit || 10,
      starting_after: params.startingAfter,
    });
  }

  // Customer Portal 세션 생성 (구독 관리 페이지)
  async createCustomerPortalSession(params: {
    customerId: string;
    returnUrl: string;
  }): Promise<Stripe.BillingPortal.Session> {
    this.logger.log(`createCustomerPortalSession: Creating portal session for customer ${params.customerId}`);

    const portalSession = await this.stripe.billingPortal.sessions.create({
      customer: params.customerId,
      return_url: params.returnUrl,
    });

    this.logger.log(`Customer portal session created: ${portalSession.id}`);
    return portalSession;
  }
} 