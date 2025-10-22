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

  @ApiProperty({ 
    description: 'Candidate minimal info',
    example: { id: 'uuid', firstName: 'John', lastName: 'Doe', lastLoginAt: '2025-10-01T12:34:56.000Z' }
  })
  @Expose()
  candidate?: any;

  @ApiProperty({ 
    description: 'Referrer minimal info',
    example: { id: 'uuid', firstName: 'Jane', lastName: 'Smith', lastLoginAt: '2025-10-02T08:00:00.000Z' }
  })
  @Expose()
  referrer?: any;

  @ApiProperty({ description: 'Calculated score (0-100)', example: 72.5 })
  @Expose()
  score?: number;

  @ApiProperty({
    description: 'Detailed breakdown of score and evidence data for testing',
    example: {
      components: {
        successRate: { rate: 0.66, score: 19.8 },
        reviewScore: { score: 0 },
        invitedScore: { score: 0 },
        candidateActive: { recentLoginWithin7Days: true, lastLoginAt: '2025-10-01T12:34:56.000Z', score: 5 },
        interest: { hasRecentAcceptedInterest: true, sinceDays: 10, score: 10 },
        circle: { relation: 'direct', score: 10 },
        premium: { isPremium: false, score: 0 }
      },
      total: 44.8,
      cappedTotal: 44.8
    }
  })
  @Expose()
  scoreDetails?: any;

  @ApiProperty({ description: 'Number of deck rows that include this candidate', example: 3 })
  @Expose()
  inDeckCount?: number;
}
