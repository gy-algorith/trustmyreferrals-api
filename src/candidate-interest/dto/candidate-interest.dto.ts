import { ApiProperty } from '@nestjs/swagger';
import { InterestStatus } from '../../entities/candidate-interest.entity';

export class CandidateInterestDto {
  @ApiProperty({
    description: 'Unique identifier for the candidate interest',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  id: string;

  @ApiProperty({
    description: 'Candidate ID',
    example: 'c17e25ce-4005-4d50-a461-6dac2e3996f9'
  })
  candidateId: string;

  @ApiProperty({
    description: 'Referrer ID who made the offer',
    example: '15323274-f67a-4cb1-bb6d-b83475ad08dd'
  })
  referrerId: string;

  @ApiProperty({
    description: 'Position title for the offer',
    example: 'Senior Frontend Developer'
  })
  positionTitle: string;

  @ApiProperty({
    description: 'Company name offering the position',
    example: 'Acme Corporation'
  })
  company: string;

  @ApiProperty({
    description: 'Optional comment about the position offer',
    example: 'We are looking for a talented frontend developer to join our team...',
    nullable: true
  })
  comment?: string;

  @ApiProperty({
    description: 'Current status of the interest',
    enum: InterestStatus,
    example: InterestStatus.PENDING
  })
  status: InterestStatus;

  @ApiProperty({
    description: 'When the offer was made (same as createdAt)',
    example: '2025-08-24T11:00:00.000Z'
  })
  createdAt: Date;

  @ApiProperty({
    description: 'When the candidate responded to the offer',
    example: '2025-08-24T12:00:00.000Z',
    nullable: true
  })
  respondedAt?: Date;

  @ApiProperty({
    description: 'When the record was last updated',
    example: '2025-08-24T12:00:00.000Z'
  })
  updatedAt: Date;

  // Additional user information
  @ApiProperty({
    description: 'Candidate information',
    example: {
      id: 'c17e25ce-4005-4d50-a461-6dac2e3996f9',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com'
    }
  })
  candidate?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };

  @ApiProperty({
    description: 'Referrer information',
    example: {
      id: '15323274-f67a-4cb1-bb6d-b83475ad08dd',
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane.smith@example.com'
    }
  })
  referrer?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}
