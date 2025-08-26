import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { RequirementResponse } from './requirement-response.entity';

export enum SourceType {
  PUSH = 'push', // referrer가 후보자를 추천함
  PULL = 'pull', // referrer가 후보자를 검색해서 등록함
  INVITE = 'invite', // referrer가 후보자를 초대함
}

// referrer가 추천한 후보자들을 저장하는 엔티티. requirement로 후보자를 추천받아도 덱에 저장됨
@Entity('deck') 
@Index('idx_deck_unique', ['referrerId', 'candidateId'], { unique: true })
export class Deck extends BaseEntity {
  @Column()
  referrerId: string;

  @Column()
  candidateId: string;

  @Column({
    type: 'enum',
    enum: SourceType,
    default: SourceType.INVITE,
  })
  source: SourceType;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'referrerId' })
  referrer: User;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'candidateId' })
  candidate: User;

  // Requirement Response와의 관계 (PUSH 타입으로 생성된 경우)
  @OneToMany(() => RequirementResponse, response => response.deck)
  requirementResponses: RequirementResponse[];
}
