import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class CreateRequirementResponseDto {
  @ApiProperty({ description: 'Candidate ID', example: 'uuid-string' })
  @IsString()
  @IsNotEmpty()
  candidateId: string;

  @ApiProperty({ description: 'Why this candidate is suitable', example: 'This candidate has the exact skills...' })
  @IsString()
  @IsNotEmpty()
  whyThisCandidate: string;

  @ApiProperty({ description: 'Purchase price/referral fee', example: 1000.00 })
  @IsNumber()
  @IsNotEmpty()
  purchasePrice: number;

  @ApiProperty({ description: 'Supporting skills', example: ['JavaScript', 'React', 'Node.js'], required: false })
  @IsOptional()
  supportingSkills?: string[];

  @ApiProperty({ description: 'Anonymized headline', example: 'Senior Full-Stack Developer', required: false })
  @IsOptional()
  @IsString()
  anonymizedHeadline?: string;
}
