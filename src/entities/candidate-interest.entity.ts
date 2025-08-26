import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';

export enum InterestStatus {
  PENDING = 'pending',
  REJECTED = 'rejected',
  ACCEPTED = 'accepted',
}

@Entity('candidate_interest')
@Index('idx_candidate_interest_candidate', ['candidateId'])
@Index('idx_candidate_interest_referrer', ['referrerId'])
@Index('idx_candidate_interest_status', ['status'])
export class CandidateInterest extends BaseEntity {
  @Column()
  candidateId: string;

  @Column()
  referrerId: string;

  @Column()
  positionTitle: string;

  @Column()
  company: string;

  @Column({ type: 'text', nullable: true })
  comment?: string;

  @Column({
    type: 'enum',
    enum: InterestStatus,
    default: InterestStatus.PENDING,
  })
  status: InterestStatus;

  @Column({ type: 'timestamp', nullable: true })
  respondedAt?: Date;

  // Relationships
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'candidateId' })
  candidate: User;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'referrerId' })
  referrer: User;
}
