import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsArray, IsString, IsEnum, IsNumber, Min } from 'class-validator';
import { WorkStyle } from '../../entities/requirement.entity';

export class SearchRequirementDto {
  @ApiProperty({ description: 'Skills to search for (comma-separated)', required: false, example: 'JavaScript,React,TypeScript' })
  @IsOptional()
  @IsString()
  skills?: string;

  @ApiProperty({ description: 'Location to search in', required: false, example: 'San Francisco' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty({ 
    description: 'Work style preferences (comma-separated)', 
    required: false, 
    enum: WorkStyle, 
    example: 'remote,hybrid' 
  })
  @IsOptional()
  @IsString()
  workStyle?: string;

  @ApiProperty({ 
    description: 'Sort by', 
    required: false, 
    enum: ['newest', 'oldest', 'mostResponses'],
    example: 'newest'
  })
  @IsOptional()
  @IsEnum(['newest', 'oldest', 'mostResponses'])
  sortBy?: 'newest' | 'oldest' | 'mostResponses';

  @ApiProperty({ description: 'Page number', required: false, minimum: 1, example: 1 })
  @IsOptional()
  @IsString()
  page?: string;

  @ApiProperty({ description: 'Items per page', required: false, minimum: 1, example: 10 })
  @IsOptional()
  @IsString()
  limit?: string;
}
