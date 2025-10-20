import { Controller, Post, Put, Body, UseGuards, Request, Param, HttpException, HttpStatus, Delete } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiBody, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { ResumeService } from './resume.service';
import { ResumeSectionType } from '../entities/resume.entity';
import { 
  ProfessionalSummaryDto, 
  WorkExperienceDto, 
  EducationDto, 
  SkillDto, 
  AwardDto,
  UpdateProfessionalSummaryDto,
  UpdateWorkExperienceDto,
  UpdateEducationDto,
  UpdateSkillDto,
  UpdateAwardDto
} from './dto/resume-section.dto';
import { ResumeSectionUtils } from './utils/resume-section.utils';

@ApiTags('resume-sections')
@Controller('resume/sections')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ResumeSectionsController {
  constructor(private readonly resumeService: ResumeService) {}

  @Post('summary')
  @Roles(UserRole.CANDIDATE)
  @ApiOperation({
    summary: 'Create Professional Summary Section',
    description: 'Candidate creates Professional Summary section. Summary can only exist once and has no order.',
  })
  @ApiBody({ type: ProfessionalSummaryDto })
  @ApiResponse({
    status: 201,
    description: 'Professional Summary section has been successfully created.',
  })
  @ApiResponse({
    status: 400,
    description: 'Professional Summary already exists.',
  })
  async createProfessionalSummary(
    @Body() createDto: ProfessionalSummaryDto,
    @Request() req: any,
  ) {
    try {
      const userId = req.user.id;
      
      // 기존 summary 섹션이 있는지 확인
      const existingSection = await this.resumeService.getResumeSectionByType(
        userId, 
        ResumeSectionType.PROFESSIONAL_SUMMARY
      );

      if (existingSection) {
        throw new HttpException(
          {
            success: false,
            message: 'Professional Summary already exists. Use PUT to update.',
            error: 'DUPLICATE_SECTION'
          },
          HttpStatus.BAD_REQUEST
        );
      }

      // 새 섹션 생성 (순서는 0으로 고정)
      const resume = await this.resumeService.createResumeSection({
        userId: userId,
        sectionType: ResumeSectionType.PROFESSIONAL_SUMMARY,
        sectionOrder: 0,
        sectionData: { summary: createDto.summary }
      });

      return ResumeSectionUtils.createSuccessResponse(resume, 'Professional Summary has been created.');
    } catch (error) {
      // HttpException은 그대로 던지기
      if (error instanceof HttpException) {
        throw error;
      }
      
      // 기타 에러는 500으로 처리
      throw new HttpException(
        {
          success: false,
          message: 'Failed to create professional summary',
          error: 'INTERNAL_SERVER_ERROR'
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Put('summary')
  @Roles(UserRole.CANDIDATE)
  @ApiOperation({
    summary: 'Update Professional Summary Section',
    description: 'Candidate updates existing Professional Summary section.',
  })
  @ApiBody({ type: UpdateProfessionalSummaryDto })
  @ApiResponse({
    status: 200,
    description: 'Professional Summary section has been successfully updated.',
  })
  async updateProfessionalSummary(
    @Body() updateDto: UpdateProfessionalSummaryDto,
    @Request() req: any,
  ) {
    const userId = req.user.id;
    
    // 기존 summary 섹션 찾기
    const existingSection = await this.resumeService.getResumeSectionByType(
      userId, 
      ResumeSectionType.PROFESSIONAL_SUMMARY
    );

    if (!existingSection) {
      return ResumeSectionUtils.createErrorResponse('Professional Summary not found. Create one first.');
    }

    // 섹션 업데이트
    const updatedSection = await this.resumeService.updateResumeSection(
      existingSection.id,
      { sectionData: { summary: updateDto.summary } }
    );

    return ResumeSectionUtils.createSuccessResponse(updatedSection, 'Professional Summary has been updated.');
  }

  @Post('experience')
  @Roles(UserRole.CANDIDATE)
  @ApiOperation({
    summary: 'Create Work Experience Section',
    description: 'Candidate creates a new Work Experience section.',
  })
  @ApiBody({ type: WorkExperienceDto })
  @ApiResponse({
    status: 201,
    description: 'Work Experience section has been successfully created.',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error.',
  })
  async createWorkExperience(
    @Body() createDto: WorkExperienceDto,
    @Request() req: any,
  ) {
    try {
      const userId = req.user.id;
      
      // 다음 순서 계산
      const existingSections = await this.resumeService.getUserResumeSections(userId);
      const nextOrder = ResumeSectionUtils.calculateNextOrder(existingSections, ResumeSectionType.WORK_EXPERIENCE);
      
      const resume = await this.resumeService.createResumeSection({
        userId: userId,
        sectionType: ResumeSectionType.WORK_EXPERIENCE,
        sectionOrder: nextOrder,
        sectionData: { 
          title: createDto.title,
          company: createDto.company,
          dateRange: createDto.dateRange,
          description: createDto.description
        }
      });

      return ResumeSectionUtils.createSuccessResponse(resume, 'Work Experience has been successfully added.');
    } catch (error) {
      // HttpException은 그대로 던지기
      if (error instanceof HttpException) {
        throw error;
      }
      
      // 기타 에러는 500으로 처리
      throw new HttpException(
        {
          success: false,
          message: 'Failed to create work experience',
          error: 'INTERNAL_SERVER_ERROR'
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Put('experience/:id')
  @Roles(UserRole.CANDIDATE)
  @ApiOperation({
    summary: 'Update Work Experience Section',
    description: 'Candidate updates existing Work Experience section.',
  })
  @ApiParam({ name: 'id', description: 'Work Experience section ID' })
  @ApiBody({ type: UpdateWorkExperienceDto })
  @ApiResponse({
    status: 200,
    description: 'Work Experience section has been successfully updated.',
  })
  async updateWorkExperience(
    @Param('id') id: string,
    @Body() updateDto: UpdateWorkExperienceDto,
    @Request() req: any,
  ) {
    const userId = req.user.id;
    
    // 섹션 존재 여부 및 소유권 확인
    const existingSection = await this.resumeService.getResumeSection(id);
    if (!existingSection || existingSection.userId !== userId || existingSection.sectionType !== ResumeSectionType.WORK_EXPERIENCE) {
      return ResumeSectionUtils.createErrorResponse('Work Experience section not found or access denied.');
    }

    // 섹션 업데이트
    const updatedSection = await this.resumeService.updateResumeSection(
      id,
      { sectionData: { 
        title: updateDto.title,
        company: updateDto.company,
        dateRange: updateDto.dateRange,
        description: updateDto.description
      }}
    );

    return ResumeSectionUtils.createSuccessResponse(updatedSection, 'Work Experience has been successfully updated.');
  }

  @Post('education')
  @Roles(UserRole.CANDIDATE)
  @ApiOperation({
    summary: 'Create Education Section',
    description: 'Candidate creates a new Education section.',
  })
  @ApiBody({ type: EducationDto })
  @ApiResponse({
    status: 201,
    description: 'Education section has been successfully created.',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error or invalid data.',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error.',
  })
  async createEducation(
    @Body() createDto: EducationDto,
    @Request() req: any,
  ) {
    try {
      const userId = req.user.id;
      
      // 연도 validation
      const yearValidation = ResumeSectionUtils.validateYearRange(createDto.startYear, createDto.endYear);
      if (!yearValidation.isValid) {
        throw new HttpException(
          {
            success: false,
            message: yearValidation.message,
            error: 'VALIDATION_ERROR'
          },
          HttpStatus.BAD_REQUEST
        );
      }
      
      // 다음 순서 계산
      const existingSections = await this.resumeService.getUserResumeSections(userId);
      const nextOrder = ResumeSectionUtils.calculateNextOrder(existingSections, ResumeSectionType.EDUCATION);
      
      const resume = await this.resumeService.createResumeSection({
        userId: userId,
        sectionType: ResumeSectionType.EDUCATION,
        sectionOrder: nextOrder,
        sectionData: { 
          degreeType: createDto.degreeType,
          fieldOfStudy: createDto.fieldOfStudy,
          institution: createDto.institution,
          startYear: createDto.startYear,
          endYear: createDto.endYear,
          description: createDto.description
        }
      });

      return ResumeSectionUtils.createSuccessResponse(resume, 'Education has been successfully added.');
    } catch (error) {
      // HttpException은 그대로 던지기
      if (error instanceof HttpException) {
        throw error;
      }
      
      // 기타 에러는 500으로 처리
      throw new HttpException(
        {
          success: false,
          message: 'Failed to create education',
          error: 'INTERNAL_SERVER_ERROR'
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Put('education/:id')
  @Roles(UserRole.CANDIDATE)
  @ApiOperation({
    summary: 'Update Education Section',
    description: 'Candidate updates existing Education section.',
  })
  @ApiParam({ name: 'id', description: 'Education section ID' })
  @ApiBody({ type: UpdateEducationDto })
  @ApiResponse({
    status: 200,
    description: 'Education section has been successfully updated.',
  })
  async updateEducation(
    @Param('id') id: string,
    @Body() updateDto: UpdateEducationDto,
    @Request() req: any,
  ) {
    const userId = req.user.id;
    
    // 연도 validation
    const yearValidation = ResumeSectionUtils.validateYearRange(updateDto.startYear, updateDto.endYear);
    if (!yearValidation.isValid) {
      return ResumeSectionUtils.createErrorResponse(yearValidation.message!);
    }
    
    // 섹션 존재 여부 및 소유권 확인
    const existingSection = await this.resumeService.getResumeSection(id);
    if (!existingSection || existingSection.userId !== userId || existingSection.sectionType !== ResumeSectionType.EDUCATION) {
      return ResumeSectionUtils.createErrorResponse('Education section not found or access denied.');
    }

    // 섹션 업데이트
    const updatedSection = await this.resumeService.updateResumeSection(
      id,
      { sectionData: { 
        degreeType: updateDto.degreeType,
        fieldOfStudy: updateDto.fieldOfStudy,
        institution: updateDto.institution,
        startYear: updateDto.startYear,
        endYear: updateDto.endYear,
        description: updateDto.description
      }}
    );

    return ResumeSectionUtils.createSuccessResponse(updatedSection, 'Education has been successfully updated.');
  }

  @Post('skills')
  @Roles(UserRole.CANDIDATE)
  @ApiOperation({
    summary: 'Add Individual Skill',
    description: 'Candidate adds an individual skill. Each skill is stored separately and order is calculated automatically.',
  })
  @ApiBody({ type: SkillDto })
  @ApiResponse({
    status: 201,
    description: 'Skill has been successfully added.',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error or invalid data.',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error.',
  })
  async addSkill(
    @Body() createDto: SkillDto,
    @Request() req: any,
  ) {
    try {
      const userId = req.user.id;
      
      // 스킬 이름 validation
      const skillValidation = ResumeSectionUtils.validateSkillName(createDto.name);
      if (!skillValidation.isValid) {
        throw new HttpException(
          {
            success: false,
            message: skillValidation.message,
            error: 'VALIDATION_ERROR'
          },
          HttpStatus.BAD_REQUEST
        );
      }
      
      // 다음 순서 계산
      const existingSkills = await this.resumeService.getUserResumeSections(userId);
      const nextOrder = ResumeSectionUtils.calculateNextOrder(existingSkills, ResumeSectionType.SKILLS);
      
      const resume = await this.resumeService.createResumeSection({
        userId: userId,
        sectionType: ResumeSectionType.SKILLS,
        sectionOrder: nextOrder,
        sectionData: { 
          skillName: createDto.name
        }
      });

      return ResumeSectionUtils.createSuccessResponse(resume, `Skill "${createDto.name}" has been successfully added.`);
    } catch (error) {
      // HttpException은 그대로 던지기
      if (error instanceof HttpException) {
        throw error;
      }
      
      // 기타 에러는 500으로 처리
      throw new HttpException(
        {
          success: false,
          message: 'Failed to add skill',
          error: 'INTERNAL_SERVER_ERROR'
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Put('skills/:id')
  @Roles(UserRole.CANDIDATE)
  @ApiOperation({
    summary: 'Update Skill',
    description: 'Candidate updates existing skill.',
  })
  @ApiParam({ name: 'id', description: 'Skill section ID' })
  @ApiBody({ type: UpdateSkillDto })
  @ApiResponse({
    status: 200,
    description: 'Skill has been successfully updated.',
  })
  async updateSkill(
    @Param('id') id: string,
    @Body() updateDto: UpdateSkillDto,
    @Request() req: any,
  ) {
    const userId = req.user.id;
    
    // 스킬 이름 validation
    const skillValidation = ResumeSectionUtils.validateSkillName(updateDto.name);
    if (!skillValidation.isValid) {
      return ResumeSectionUtils.createErrorResponse(skillValidation.message!);
    }
    
    // 섹션 존재 여부 및 소유권 확인
    const existingSection = await this.resumeService.getResumeSection(id);
    if (!existingSection || existingSection.userId !== userId || existingSection.sectionType !== ResumeSectionType.SKILLS) {
      return ResumeSectionUtils.createErrorResponse('Skill section not found or access denied.');
    }

    // 섹션 업데이트
    const updatedSection = await this.resumeService.updateResumeSection(
      id,
      { sectionData: { skillName: updateDto.name }}
    );

    return ResumeSectionUtils.createSuccessResponse(updatedSection, 'Skill has been successfully updated.');
  }

  @Delete('skills/:id')
  @Roles(UserRole.CANDIDATE)
  @ApiOperation({
    summary: 'Delete Skill',
    description: 'Candidate deletes a specific skill.',
  })
  @ApiParam({ name: 'id', description: 'Skill section ID' })
  @ApiResponse({
    status: 200,
    description: 'Skill has been successfully deleted.',
  })
  @ApiResponse({
    status: 404,
    description: 'Skill section not found or access denied.',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error.',
  })
  async deleteSkill(
    @Param('id') id: string,
    @Request() req: any,
  ) {
    try {
      const userId = req.user.id;
      
      // 섹션 존재 여부 및 소유권 확인
      const existingSection = await this.resumeService.getResumeSection(id);
      if (!existingSection || existingSection.userId !== userId || existingSection.sectionType !== ResumeSectionType.SKILLS) {
        throw new HttpException(
          {
            success: false,
            message: 'Skill section not found or access denied.',
            error: 'NOT_FOUND'
          },
          HttpStatus.NOT_FOUND
        );
      }

      // 스킬 섹션 삭제 (deactivate)
      await this.resumeService.deactivateResumeSection(id);

      return ResumeSectionUtils.createSuccessResponse(
        { id, skillName: existingSection.sectionData?.skillName },
        'Skill has been successfully deleted.'
      );
    } catch (error) {
      // HttpException은 그대로 던지기
      if (error instanceof HttpException) {
        throw error;
      }
      
      // 기타 에러는 500으로 처리
      throw new HttpException(
        {
          success: false,
          message: 'Failed to delete skill',
          error: 'INTERNAL_SERVER_ERROR'
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('awards')
  @Roles(UserRole.CANDIDATE)
  @ApiOperation({
    summary: 'Create Awards and Certifications Section',
    description: 'Candidate creates a new Awards and Certifications section.',
  })
  @ApiBody({ type: AwardDto })
  @ApiResponse({
    status: 201,
    description: 'Awards and Certifications section has been successfully created.',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error or invalid data.',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error.',
  })
  async createAwards(
    @Body() createDto: AwardDto,
    @Request() req: any,
  ) {
    try {
      const userId = req.user.id;
      
      // 날짜 validation
      const dateValidation = ResumeSectionUtils.validateDateFormat(createDto.dateAwarded);
      if (!dateValidation.isValid) {
        throw new HttpException(
          {
            success: false,
            message: dateValidation.message,
            error: 'VALIDATION_ERROR'
          },
          HttpStatus.BAD_REQUEST
        );
      }
      
      // 다음 순서 계산
      const existingSections = await this.resumeService.getUserResumeSections(userId);
      const nextOrder = ResumeSectionUtils.calculateNextOrder(existingSections, ResumeSectionType.AWARDS_AND_CERTIFICATIONS);
      
      const resume = await this.resumeService.createResumeSection({
        userId: userId,
        sectionType: ResumeSectionType.AWARDS_AND_CERTIFICATIONS,
        sectionOrder: nextOrder,
        sectionData: { 
          awardName: createDto.awardName,
          issuingOrganization: createDto.issuingOrganization,
          dateAwarded: createDto.dateAwarded,
          description: createDto.description
        }
      });

      return ResumeSectionUtils.createSuccessResponse(resume, 'Award has been successfully added.');
    } catch (error) {
      // HttpException은 그대로 던지기
      if (error instanceof HttpException) {
        throw error;
      }
      
      // 기타 에러는 500으로 처리
      throw new HttpException(
        {
          success: false,
          message: 'Failed to create award',
          error: 'INTERNAL_SERVER_ERROR'
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Put('awards/:id')
  @Roles(UserRole.CANDIDATE)
  @ApiOperation({
    summary: 'Update Awards and Certifications Section',
    description: 'Candidate updates existing Awards and Certifications section.',
  })
  @ApiParam({ name: 'id', description: 'Award section ID' })
  @ApiBody({ type: UpdateAwardDto })
  @ApiResponse({
    status: 200,
    description: 'Award section has been successfully updated.',
  })
  async updateAward(
    @Param('id') id: string,
    @Body() updateDto: UpdateAwardDto,
    @Request() req: any,
  ) {
    const userId = req.user.id;
    
    // 날짜 validation
    const dateValidation = ResumeSectionUtils.validateDateFormat(updateDto.dateAwarded);
    if (!dateValidation.isValid) {
      return ResumeSectionUtils.createErrorResponse(dateValidation.message!);
    }
    
    // 섹션 존재 여부 및 소유권 확인
    const existingSection = await this.resumeService.getResumeSection(id);
    if (!existingSection || existingSection.userId !== userId || existingSection.sectionType !== ResumeSectionType.AWARDS_AND_CERTIFICATIONS) {
      return ResumeSectionUtils.createErrorResponse('Award section not found or access denied.');
    }

    // 섹션 업데이트
    const updatedSection = await this.resumeService.updateResumeSection(
      id,
      { sectionData: { 
        awardName: updateDto.awardName,
        issuingOrganization: updateDto.issuingOrganization,
        dateAwarded: updateDto.dateAwarded,
        description: updateDto.description
      }}
    );

    return ResumeSectionUtils.createSuccessResponse(updatedSection, 'Award section has been successfully updated.');
  }

  @Delete(':id')
  @Roles(UserRole.CANDIDATE)
  @ApiOperation({
    summary: 'Delete Resume Section',
    description: 'Candidate deletes a specific resume section by ID.',
  })
  @ApiParam({ name: 'id', description: 'Resume section ID' })
  @ApiResponse({
    status: 200,
    description: 'Resume section has been successfully deleted.',
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete Professional Summary section.',
  })
  @ApiResponse({
    status: 404,
    description: 'Resume section not found or access denied.',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error.',
  })
  async deleteResumeSection(
    @Param('id') id: string,
    @Request() req: any,
  ) {
    try {
      const userId = req.user.id;
      
      // 섹션 존재 여부 및 소유권 확인
      const existingSection = await this.resumeService.getResumeSection(id);
      if (!existingSection || existingSection.userId !== userId) {
        throw new HttpException(
          {
            success: false,
            message: 'Resume section not found or access denied.',
            error: 'NOT_FOUND'
          },
          HttpStatus.NOT_FOUND
        );
      }

      // Professional Summary는 삭제 불가 (순서 0으로 고정)
      if (existingSection.sectionType === ResumeSectionType.PROFESSIONAL_SUMMARY) {
        throw new HttpException(
          {
            success: false,
            message: 'Cannot delete Professional Summary section.',
            error: 'INVALID_OPERATION'
          },
          HttpStatus.BAD_REQUEST
        );
      }

      // 섹션 삭제 (deactivate)
      await this.resumeService.deactivateResumeSection(id);

      return ResumeSectionUtils.createSuccessResponse(
        { id, sectionType: existingSection.sectionType },
        'Resume section has been successfully deleted.'
      );
    } catch (error) {
      // HttpException은 그대로 던지기
      if (error instanceof HttpException) {
        throw error;
      }
      
      // 기타 에러는 500으로 처리
      throw new HttpException(
        {
          success: false,
          message: 'Failed to delete resume section',
          error: 'INTERNAL_SERVER_ERROR'
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
