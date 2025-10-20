import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import {
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn
} from 'typeorm';
import { UserRole, UserStatus } from '../common/enums/user-role.enum';
import { BaseEntity } from './base.entity';

export enum StripeOnboardingStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

// 구독 구매 여부 (boolean)
// true: 구독을 구매함, false: 구독을 구매하지 않음

// 구독 플랜 타입 enum을 user.entity.ts로 이동
export enum PlanType {
  // 후보자 플랜
  CANDIDATE_FREE = 'candidate_free',
  CANDIDATE_BASIC = 'candidate_basic',
  CANDIDATE_PREMIUM = 'candidate_premium',
  
  // 추천인 플랜
  REFERRER_FREE = 'referrer_free',
  REFERRER_BASIC = 'referrer_basic',
  REFERRER_PREMIUM = 'referrer_premium',
  REFERRER_ENTERPRISE = 'referrer_enterprise',
}

// 사용자 엔티티. 모든 사용자의 정보를 저장함. 이제 사용자당 하나의 역할만 가질 수 있음
@Entity('users')
export class User extends BaseEntity {
  @ApiProperty({ description: '사용자 ID' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: '이메일 (같은 이메일로 여러 역할 가능)' })
  @Column({ nullable: false })
  @Index()
  email: string;

  @ApiProperty({ description: '사용자 이름' })
  @Column({ nullable: false })
  firstName: string;

  @ApiProperty({ description: '사용자 성' })
  @Column({ nullable: false })
  lastName: string;

  @ApiProperty({ description: '사용자 역할 (사용자당 하나의 역할만 가능)' })
  @Column({ type: 'enum', enum: UserRole, nullable: false })
  role: UserRole;

  @ApiProperty({ description: '사용자 상태' })
  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.PENDING,
  })
  status: UserStatus;

  @ApiProperty({ description: '사용자 비밀번호' })
  @Column({ nullable: true })
  @Exclude()
  password?: string;

  @ApiProperty({ description: '마지막 로그인 시간' })
  @Column({ nullable: true })
  lastLoginAt?: Date;

  @ApiProperty({ description: '이메일 인증 여부' })
  @Column({ default: false })
  emailVerified: boolean;

  @ApiProperty({ description: '비밀번호 재설정 토큰' })
  @Column({ nullable: true })
  passwordResetToken?: string;

  @ApiProperty({ description: '비밀번호 재설정 토큰 만료 시간' })
  @Column({ nullable: true })
  passwordResetExpires?: Date;

  @ApiProperty({ description: 'Refresh 토큰 (JWT refresh용)' })
  @Column({ nullable: true })
  refreshToken?: string;

  @ApiProperty({ description: '추천인 ID (후보자 가입 시 사용)' })
  @Column({ nullable: true })
  @Index()
  referredBy?: string;

  // Stripe 관련 필드들
  @ApiProperty({ description: 'Stripe 계정 ID (추천인용)' })
  @Column({ nullable: true })
  stripeAccountId?: string;

  @ApiProperty({ description: 'Stripe 온보딩 상태 (추천인용)' })
  @Column({ 
    type: 'enum', 
    enum: StripeOnboardingStatus, 
    default: StripeOnboardingStatus.NOT_STARTED,
    nullable: true 
  })
  stripeOnboardingStatus?: StripeOnboardingStatus;

  @ApiProperty({ description: 'Stripe Customer ID (결제용)' })
  @Column({ nullable: true })
  stripeCustomerId?: string;

  @ApiProperty({ description: '현재 구독 플랜 코드' })
  @Column({ nullable: true, default: 'FREE' })
  currentPlanCode?: string;

  // 구독 상태 관련 필드들
  @ApiProperty({ description: 'Stripe 구독 ID' })
  @Column({ nullable: true })
  stripeSubscriptionId?: string;

  // 통합된 구독 관련 필드들
  @ApiProperty({ description: '구독 구매 여부' })
  @Column({
    type: 'boolean',
    default: false,
    nullable: true
  })
  subscriptionPurchased?: boolean;

  @ApiProperty({ description: '구독 시작일' })
  @Column({ nullable: true })
  subscriptionStartDate?: Date;

  @ApiProperty({ description: '구독 종료일' })
  @Column({ nullable: true })
  subscriptionEndDate?: Date;

  @ApiProperty({ description: '다음 결제일' })
  @Column({ nullable: true })
  nextBillingDate?: Date;

  @ApiProperty({ description: '구독 간격 (month/year)' })
  @Column({ nullable: true })
  subscriptionInterval?: 'month' | 'year';

  // Referrer 전용 필드들
  @ApiProperty({ description: '후보자 cap (ENTERPRISE 플랜의 경우 사용자별 설정)' })
  @Column({ nullable: true, default: 0 })
  candidateCap?: number;

  @ApiProperty({ description: '현재 구매한 후보자 수' })
  @Column({ nullable: true, default: 0 })
  purchasedCandidates?: number;

  @ApiProperty({ description: '계정 잔액 (USD, cents 단위)' })
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  balance: number;

  // 메서드들 (TypeORM 컬럼으로 인식되지 않음)
  hasRole(role: UserRole): boolean {
    return this.role === role;
  }

  isReferrer(): boolean {
    return this.role === UserRole.REFERRER;
  }

  isCandidate(): boolean {
    return this.role === UserRole.CANDIDATE;
  }

  isActive(): boolean {
    return this.status === UserStatus.ACTIVE;
  }

  isPending(): boolean {
    return this.status === UserStatus.PENDING;
  }

  getSubscriptionPurchased(): boolean {
    return this.subscriptionPurchased || false;
  }

  updateSubscriptionPurchased(purchased: boolean): void {
    this.subscriptionPurchased = purchased;
  }

  hasActiveSubscription(): boolean {
    return this.subscriptionPurchased === true;
  }

  isFree(): boolean {
    return this.subscriptionPurchased === false;
  }

  // 비밀번호 재설정 토큰 관련 헬퍼 메서드
  getPasswordResetToken(): string | undefined {
    return this.passwordResetToken;
  }

  setPasswordResetToken(token: string, expiresAt: Date): void {
    this.passwordResetToken = token;
    this.passwordResetExpires = expiresAt;
  }

  clearPasswordResetToken(): void {
    this.passwordResetToken = undefined;
    this.passwordResetExpires = undefined;
  }

  isPasswordResetTokenValid(): boolean {
    return this.passwordResetExpires ? new Date() < this.passwordResetExpires : false;
  }

  // Refresh 토큰 관련 헬퍼 메서드
  getRefreshToken(): string | undefined {
    return this.refreshToken;
  }

  setRefreshToken(token: string): void {
    this.refreshToken = token;
  }

  clearRefreshToken(): void {
    this.refreshToken = undefined;
  }

  hasValidRefreshToken(): boolean {
    return !!this.refreshToken && this.refreshToken.trim() !== '';
  }
}
