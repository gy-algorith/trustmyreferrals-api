import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { User } from './user.entity';
import { BaseEntity } from './base.entity';

export enum WorkStyle {
  Remote = 'remote',
  Hybrid = 'hybrid',
}

export enum RequirementStatus {
  OPEN = 'open',
  CLOSED = 'closed',
}


// referrer가 등록하는 requirement 엔티티. 이를 통해 다른 referrer가 후보자를 추천할 수 있음.
@Entity('requirements')
export class Requirement extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column('text')
  overview: string;

  @Column('text', { array: true, nullable: true })
  skills: string[];

  @Column('text', { array: true, nullable: true })
  desiredSkills: string[];

  @Column({ nullable: true })
  location: string;

  @Column({
    type: 'enum',
    enum: RequirementStatus,
    default: RequirementStatus.OPEN,
  })
  status: RequirementStatus;
  @Column({
    type: 'enum',
    enum: WorkStyle,
    array: true,
    nullable: true,
    default: [WorkStyle.Remote],
  })
  workStyle: WorkStyle[];

  // 급여 상한선 (선택사항)
  @Column({ nullable: true })
  salaryCeiling: number;

  @Column()
  referrerId: string;

  // 마감일 (선택사항)
  @Column({ type: 'date', nullable: true })
  closingDate: Date;

  // 공개 범위 (circle: 모임 내 공개, public: 전체 공개)
  @Column({ 
    type: 'enum',
    enum: ['circle', 'public'],
    default: 'public',
  })
  visibility: 'circle' | 'public';

  @ManyToOne(() => User)
  @JoinColumn({ name: 'referrerId' })
  referrer: User;

  // TODO: Add recommendations relationship when CandidateRecommendation entity is created
  // @OneToMany('CandidateRecommendation', 'jobRequirement')
  // recommendations: any[];
}
