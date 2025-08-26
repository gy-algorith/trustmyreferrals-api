import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { Requirement } from './requirement.entity';
import { User } from './user.entity';
import { Deck } from './deck.entity';

export enum RequirementResponseStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  PURCHASED = 'purchased',
}

// referrer가 다른 referrer의 requirement에 제안을 하는 엔티티
@Entity('requirement_responses')
export class RequirementResponse extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  requirementId: string;

  @ManyToOne(() => Requirement, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'requirementId' })
  requirement: Requirement;

  @Column()
  candidateId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'candidateId' })
  candidate: User;

  @Column()
  referrerId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'referrerId' })
  referrer: User;

  @Column({ length: 100 })
  candidateOverview: string;

  @Column({ length: 1000 })
  whyThisCandidate: string;

  @Column('integer')
  purchasePrice: number; // cents 단위

  @Column({
    type: 'enum',
    enum: RequirementResponseStatus,
    default: RequirementResponseStatus.PENDING,
  })
  status: RequirementResponseStatus;

  // Deck과의 관계 (PUSH 타입으로 생성된 경우)
  @Column({ nullable: true })
  deckId?: string;

  @ManyToOne(() => Deck, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'deckId' })
  deck?: Deck;
} 