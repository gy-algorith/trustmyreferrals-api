import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, MaxLength, IsUUID } from 'class-validator';

export class CreateCandidateInterestDto {
  @ApiProperty({
    description: 'Candidate ID to offer the position to',
    example: 'c17e25ce-4005-4d50-a461-6dac2e3996f9'
  })
  @IsNotEmpty()
  @IsUUID()
  candidateId: string;

  @ApiProperty({
    description: 'Position title for the offer',
    example: 'Senior Frontend Developer',
    maxLength: 200
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  positionTitle: string;

  @ApiProperty({
    description: 'Company name offering the position',
    example: 'Acme Corporation',
    maxLength: 200
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  company: string;

  @ApiProperty({
    description: 'Optional comment about the position offer',
    example: 'We are looking for a talented frontend developer to join our team...',
    maxLength: 1000,
    required: false
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;
}
