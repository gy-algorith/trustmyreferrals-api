import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntity } from './base.entity';

export enum TransactionType {
  CHECKOUT = 'checkout',        // 일반 결제
  PAYOUT = 'payout',           // 출금
  ADD_FUND = 'add_fund',       // 자금 추가
  SUBSCRIPTION = 'subscription', // 구독
  REFERRAL = 'referral',       // 추천 수수료
}

export enum TransactionStatus {
  PENDING = 'pending',          // 처리 중
  SUCCEEDED = 'succeeded',      // 성공
  PAID = 'paid',               // 출금 완료
  FAILED = 'failed',           // 실패
}

// 모든 금융 거래를 저장하는 엔티티 (결제, 출금, 구독, 추천 등)
@Entity('transactions')
export class Transaction extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  buyUserId: string;

  // null인경우 판매자가 플랫폼 (구독의 경우), 이 외의 경우에는 referrer이 다른 referrer에게 후보자를 추천했을 수 있음.
  @Column({ nullable: true })
  sellUserId: string;

  // 플랫폼 수수료 구독의경우 금액의 100%
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: false, default: 0 })
  sellUserReceivedAmount: number;

  @Column({ type: 'enum', enum: TransactionType })
  type: TransactionType;

  // 플랫폼 수수료 구독의경우 금액의 100%
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: false })
  platformAmount: number;

  @Column({ default: 'usd' })
  currency: string;

  @Column({ nullable: true })
  stripeObjectId: string;

  @Column({ nullable: false })
  responseId: string;

  @Column({ type: 'enum', enum: TransactionStatus, default: TransactionStatus.PENDING })
  status: TransactionStatus;

  @Column({ nullable: true })
  description: string;

  @ApiProperty({ description: '결제 세션 ID (Stripe Checkout Session)' })
  @Column({ nullable: true })
  sessionId?: string;

  @ApiProperty({ description: '결제 메타데이터 (JSON 형태)' })
  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;
} 