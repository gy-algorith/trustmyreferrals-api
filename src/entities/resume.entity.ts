import { Column, Entity, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { ResumeValidation } from './resume-validation.entity';
import { User } from './user.entity';

export enum ResumeSectionType {
  PROFESSIONAL_SUMMARY = 'professional_summary',
  WORK_EXPERIENCE = 'work_experience',
  EDUCATION = 'education',
  SKILLS = 'skills',
  AWARDS_AND_CERTIFICATIONS = 'awards_and_certifications'
}

export enum SuggestionStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

// referrer가 후보자의 이력서를 저장하는 엔티티. 이력서는 section당 하나의 엔티티로 저장됨. entity이름이 resume이지만 전체 이력서를 저장하는 것이 아님.
@Entity('resume')
export class Resume extends BaseEntity {
  @Column({
    type: 'enum',
    enum: ResumeSectionType,
  })
  sectionType: ResumeSectionType;

  @Column()
  sectionOrder: number;

  @Column({ type: 'jsonb' })
  sectionData: Record<string, any>; // 단일 객체

  @Column({ default: true })
  isActive: boolean;

  // User와의 관계를 위한 userId 컬럼
  @Column({ type: 'uuid' })
  userId: string;

  // User와의 관계
  @ManyToOne(() => User, user => user.id)
  @JoinColumn({ name: 'userId' })
  user: User;

  // @OneToMany(() => ResumeSuggestion, suggestion => suggestion.resume, { cascade: true })
  // suggestions: ResumeSuggestion[];

  @OneToMany(() => ResumeValidation, validation => validation.resume, { cascade: true })
  validations: ResumeValidation[];
}
