import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Resume } from './resume.entity';

// referrer가 후보자의 이력서를 검증하고 그 결과를 저장하는 엔티티, referrer은 section당 하나의 validation만 가능함
@Entity('resume_validations')
export class ResumeValidation extends BaseEntity {
  @Column({ name: 'resumeId' })
  resumeId: string;

  @ManyToOne(() => Resume, resume => resume.validations)
  @JoinColumn({ name: 'resumeId' })
  resume: Resume;

  @Column({ name: 'referrerId' })
  referrerId: string;

  @Column({ type: 'text', name: 'suggestionText' })
  text: string;

  @Column({ default: true, name: 'isActive' })
  isActive: boolean;
} 