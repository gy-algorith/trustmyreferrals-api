import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { UserRole } from '../common/enums/user-role.enum';
import { PlanType } from './user.entity';

// 구독 플랜 엔티티. 후보자와 추천인의 구독 플랜 정보를 저장함
@Entity('subscription_plans')
export class SubscriptionPlan extends BaseEntity{
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 20, unique: true })
  code: PlanType;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'integer' })
  monthlyPrice: number; // cents 단위 (예: 2900 = $29.00)

  @Column({ type: 'integer', nullable: true })
  yearlyPrice: number; // cents 단위 (예: 29000 = $290.00)

  @Column({ type: 'enum', enum: UserRole })
  targetRole: UserRole;

  @Column({ type: 'jsonb' })
  features: Record<string, any>;

  @Column({ type: 'integer', nullable: true })
  acquiredCandidateCap?: number; // Referrer 플랜별 후보자 수 제한

  @Column({ type: 'boolean', default: false })
  requiresContact: boolean; // ENTERPRISE 플랜처럼 연락 요청이 필요한지 여부

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'boolean', default: false })
  isDefault: boolean;

  @Column({ type: 'varchar', length: 100, nullable: true })
  stripeMonthlyPriceId?: string; // Stripe Dashboard에서 생성된 월간 Price ID

  @Column({ type: 'varchar', length: 100, nullable: true })
  stripeYearlyPriceId?: string; // Stripe Dashboard에서 생성된 연간 Price ID

  // 플랜이 특정 역할을 위한 것인지 확인
  isForRole(role: UserRole): boolean {
    return this.targetRole === role;
  }

  // 플랜이 무료인지 확인
  isFree(): boolean {
    return this.monthlyPrice === 0;
  }

  // 플랜이 유료인지 확인
  isPaid(): boolean {
    return this.monthlyPrice > 0;
  }

  // 플랜이 연락 요청이 필요한지 확인 (ENTERPRISE 등)
  requiresContactUs(): boolean {
    return this.requiresContact;
  }

  // Referrer 플랜의 후보자 수 제한 반환
  getCandidateCap(): number | null {
    return this.acquiredCandidateCap || null;
  }
}
