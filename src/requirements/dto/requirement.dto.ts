import { ApiProperty } from '@nestjs/swagger';
import { Expose, Transform } from 'class-transformer';
import { WorkStyle, RequirementStatus } from '../../entities/requirement.entity';

export class RequirementDto {
  @ApiProperty({ description: 'Requirement ID' })
  @Expose()
  id: string;

  @ApiProperty({ description: 'Job requirement title' })
  @Expose()
  title: string;

  @ApiProperty({ description: 'Job requirement overview' })
  @Expose()
  overview: string;

  @ApiProperty({ description: 'Required skills' })
  @Expose()
  skills: string[];

  @ApiProperty({ description: 'Desired skills' })
  @Expose()
  desiredSkills: string[];

  @ApiProperty({ description: 'Job location' })
  @Expose()
  location: string;

  @ApiProperty({ description: 'Work style preferences', enum: WorkStyle })
  @Expose()
  workStyle: WorkStyle[];

  @ApiProperty({ description: 'Salary ceiling' })
  @Expose()
  salaryCeiling: number;

  @ApiProperty({ description: 'Referrer ID' })
  @Expose()
  referrerId: string;

  @ApiProperty({ description: 'Closing date' })
  @Expose()
  @Transform(({ value }) => value?.toISOString?.() || value)
  closingDate: Date;

  @ApiProperty({ description: 'Visibility scope' })
  @Expose()
  visibility: 'circle' | 'public';

  @ApiProperty({ description: 'Requirement status', enum: RequirementStatus })
  @Expose()
  status: RequirementStatus;

  @ApiProperty({ description: 'Creation date' })
  @Expose()
  @Transform(({ value }) => value?.toISOString?.() || value)
  createdAt: Date;

  @ApiProperty({ description: 'Last update date' })
  @Expose()
  @Transform(({ value }) => value?.toISOString?.() || value)
  updatedAt: Date;

  @ApiProperty({ description: 'Referrer information' })
  @Expose()
  referrer?: any;
}
