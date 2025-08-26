import { ApiProperty } from '@nestjs/swagger';
import { Expose, Transform } from 'class-transformer';
import { RequirementResponseStatus } from '../../entities/requirement-response.entity';

export class RequirementResponseDto {
  @ApiProperty({ description: 'Response ID' })
  @Expose()
  id: string;

  @ApiProperty({ description: 'Requirement ID' })
  @Expose()
  requirementId: string;

  @ApiProperty({ description: 'Candidate ID' })
  @Expose()
  candidateId: string;

  @ApiProperty({ description: 'Referrer ID' })
  @Expose()
  referrerId: string;

  @ApiProperty({ description: 'Candidate overview' })
  @Expose()
  candidateOverview: string;

  @ApiProperty({ description: 'Why this candidate is suitable' })
  @Expose()
  whyThisCandidate: string;

  @ApiProperty({ description: 'Purchase price/referral fee' })
  @Expose()
  purchasePrice: number;

  @ApiProperty({ description: 'Response status', enum: RequirementResponseStatus })
  @Expose()
  status: RequirementResponseStatus;

  @ApiProperty({ description: 'Creation date' })
  @Expose()
  @Transform(({ value }) => value?.toISOString?.() || value)
  createdAt: Date;

  @ApiProperty({ description: 'Last update date' })
  @Expose()
  @Transform(({ value }) => value?.toISOString?.() || value)
  updatedAt: Date;

  @ApiProperty({ description: 'Candidate information' })
  @Expose()
  candidate?: any;

  @ApiProperty({ description: 'Referrer information' })
  @Expose()
  referrer?: any;
}
