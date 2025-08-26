import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsArray, IsOptional, IsNumber, IsDateString, IsEnum } from 'class-validator';
import { WorkStyle, RequirementStatus } from '../../entities/requirement.entity';

export class CreateRequirementDto {
  @ApiProperty({ description: 'Job requirement title', example: 'Senior Software Engineer' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'Job requirement overview', example: 'We are looking for a senior software engineer...' })
  @IsString()
  @IsNotEmpty()
  overview: string;

  @ApiProperty({ description: 'Required skills', example: ['JavaScript', 'React', 'Node.js'] })
  @IsArray()
  @IsOptional()
  skills?: string[];

  @ApiProperty({ description: 'Desired skills', example: ['TypeScript', 'AWS'] })
  @IsArray()
  @IsOptional()
  desiredSkills?: string[];

  @ApiProperty({ description: 'Job location', example: 'San Francisco, CA' })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiProperty({ description: 'Work style preferences', enum: WorkStyle, example: [WorkStyle.Remote, WorkStyle.Hybrid] })
  @IsArray()
  @IsOptional()
  workStyle?: WorkStyle[];

  @ApiProperty({ description: 'Salary ceiling', example: 150000 })
  @IsNumber()
  @IsOptional()
  salaryCeiling?: number;

  @ApiProperty({ description: 'Closing date', example: '2024-12-31' })
  @IsDateString()
  @IsOptional()
  closingDate?: Date;

  @ApiProperty({ description: 'Visibility scope', enum: ['circle', 'public'], example: 'public' })
  @IsEnum(['circle', 'public'])
  @IsOptional()
  visibility?: 'circle' | 'public';
}
