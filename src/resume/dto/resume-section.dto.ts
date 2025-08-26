import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, Min, Max, Length } from 'class-validator';
import { ResumeSectionType } from '../../entities/resume.entity';

// Professional Summary
export class ProfessionalSummaryDto {
  @ApiProperty({
    description: 'Professional summary content',
    example: 'Experienced software developer with 5+ years of experience in full-stack development, specializing in React, Node.js, and cloud technologies. Proven track record of delivering scalable solutions and leading development teams.'
  })
  @IsString({ message: 'Summary must be a string' })
  @IsNotEmpty({ message: 'Summary is required' })
  @Length(10, 2000, { message: 'Summary must be between 10 and 2000 characters' })
  summary: string;
}

// Work Experience
export class WorkExperienceDto {
  @ApiProperty({ description: 'Job title/role', example: 'Senior Software Engineer' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'Company name', example: 'Google' })
  @IsString()
  @IsNotEmpty()
  company: string;

  @ApiProperty({ description: 'Employment period', example: '2020 - Present' })
  @IsString()
  @IsNotEmpty()
  dateRange: string;

  @ApiProperty({ 
    description: 'Job responsibilities, achievements, and duties',
    example: 'Led development of microservices architecture, improved system performance by 30%, and mentored junior developers.'
  })
  @IsString()
  @IsNotEmpty()
  description: string;
}

// Education
export class EducationDto {
  @ApiProperty({ description: 'Degree type', example: 'Bachelor\'s Degree' })
  @IsString()
  @IsNotEmpty()
  degreeType: string;

  @ApiProperty({ description: 'Field of study/major', example: 'Computer Science' })
  @IsString()
  @IsNotEmpty()
  fieldOfStudy: string;

  @ApiProperty({ description: 'Educational institution', example: 'University of California, Berkeley' })
  @IsString()
  @IsNotEmpty()
  institution: string;

  @ApiProperty({ description: 'Start year', example: 2020 })
  @IsNumber()
  @Min(1900)
  @Max(new Date().getFullYear() + 10)
  startYear: number;

  @ApiProperty({ description: 'End year', example: 2024 })
  @IsNumber()
  @Min(1900)
  @Max(new Date().getFullYear() + 10)
  endYear: number;

  @ApiProperty({ 
    description: 'Coursework, achievements, and activities',
    example: 'Completed coursework in algorithms, data structures, software engineering, and machine learning.'
  })
  @IsString()
  @IsNotEmpty()
  description: string;
}

// Skills
export class SkillDto {
  @ApiProperty({ description: 'Skill name', example: 'JavaScript' })
  @IsString()
  @IsNotEmpty()
  name: string;
}

// Awards and Certifications
export class AwardDto {
  @ApiProperty({ description: 'Award/certification name', example: 'Certified ScrumMaster' })
  @IsString()
  @IsNotEmpty()
  awardName: string;

  @ApiProperty({ description: 'Issuing organization', example: 'Scrum Alliance' })
  @IsString()
  @IsNotEmpty()
  issuingOrganization: string;

  @ApiProperty({ description: 'Date awarded/issued', example: 'May 2023' })
  @IsString()
  @IsNotEmpty()
  dateAwarded: string;

  @ApiProperty({ 
    description: 'Award details and certification description',
    example: 'Professional scrum master certification demonstrating expertise in agile methodologies.'
  })
  @IsString()
  @IsNotEmpty()
  description: string;
}

// Update DTOs
export class UpdateProfessionalSummaryDto extends ProfessionalSummaryDto {}
export class UpdateWorkExperienceDto extends WorkExperienceDto {}
export class UpdateEducationDto extends EducationDto {}
export class UpdateSkillDto extends SkillDto {}
export class UpdateAwardDto extends AwardDto {}
