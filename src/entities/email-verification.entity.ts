import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';

/**
 * 이메일 인증 목적 열거형
 */
export enum EmailVerificationPurpose {
  REGISTER = 'register',
  PASSWORD_RESET = 'password_reset',
  EMAIL_CHANGE = 'email_change',
  ACCOUNT_VERIFICATION = 'account_verification',
  REFERRER_VERIFICATION = 'referrer_verification',
}

/**
 * 이메일 인증 정보를 저장하는 엔티티
 */
@Entity('email_verifications')
export class EmailVerification extends BaseEntity {
  @Column({ unique: true })
  verificationId: string;

  @Column()
  email: string;

  @Column()
  code: string;

  @Column({
    type: 'enum',
    enum: EmailVerificationPurpose,
    default: EmailVerificationPurpose.REGISTER,
  })
  purpose: EmailVerificationPurpose;

  @Column({ default: false })
  isVerified: boolean;

  @Column({ default: false })
  isUsed: boolean;

  @Column()
  expiresAt: Date;
}
