import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntity } from './base.entity';

export enum CircleInviteStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
}

@Entity('referrer_circle')
@Index('idx_circle_inviter', ['inviterId'])
@Index('idx_circle_accepter', ['accepterId'])
@Index('idx_circle_status', ['status'])
@Index('uq_circle_pair', ['inviterId', 'accepterId'], { unique: true })
export class ReferrerCircle extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  inviterId: string;

  @Column()
  accepterId: string;

  // 초대 상태
  @Column({ type: 'enum', enum: CircleInviteStatus, default: CircleInviteStatus.PENDING })
  status: CircleInviteStatus;

  // 초대/수락을 위한 토큰 (링크용)
  @Column({ nullable: true })
  inviteToken?: string;

  // 토큰 만료 시간
  @Column({ type: 'timestamp', nullable: true })
  tokenExpiresAt?: Date;
}


