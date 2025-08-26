import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum } from 'class-validator';

export enum ReportReason {
  INAPPROPRIATE_CONTENT = 'inappropriate_content',
  SPAM = 'spam',
  MISLEADING = 'misleading',
  DUPLICATE = 'duplicate',
  OTHER = 'other',
}

export class CreateRequirementReportDto {
  @ApiProperty({ 
    description: 'Report reason', 
    enum: ReportReason,
    example: ReportReason.INAPPROPRIATE_CONTENT
  })
  @IsEnum(ReportReason)
  @IsNotEmpty()
  reason: ReportReason;

  @ApiProperty({ description: 'Detailed description of the report', example: 'This requirement contains...' })
  @IsString()
  @IsNotEmpty()
  description: string;
}
