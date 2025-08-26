import { Controller, Post, Delete, Get, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiBody, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { ResumeService } from './resume.service';

@ApiTags('resume-validation')
@Controller('resume-validation')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ResumeValidationController {
  constructor(private readonly resumeService: ResumeService) {}

  @Post()
  @Roles(UserRole.REFERRER)
  @ApiOperation({
    summary: 'Create Resume Validation',
    description: 'Referrer creates feedback for a specific resume.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        resumeId: {
          type: 'string',
          description: 'Resume ID to validate',
        },
        text: {
          type: 'string',
          description: 'Suggestion/feedback text',
        },
      },
      required: ['resumeId', 'text'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Resume validation created successfully.',
  })
  async createValidation(
    @Body() createValidationDto: {
      resumeId: string;
      text: string;
    },
    @Request() req: any,
  ) {
    const referrerId = req.user.id;

    const validation = await this.resumeService.createValidation({
      referrerId,
      suggestionText: createValidationDto.text,
      resumeId: createValidationDto.resumeId,
    });

    return {
      success: true,
      data: validation,
      message: 'Validation created successfully',
    };
  }

  @Get(':resumeId')
  @Roles(UserRole.REFERRER)
  @ApiOperation({
    summary: 'Get Resume Validations (Referrer Only)',
    description: 'Referrer retrieves validations for a candidate\'s resume section. Only accessible if the candidate is in the referrer\'s deck.',
  })
  @ApiParam({
    name: 'resumeId',
    description: 'ID of the resume section to get validations for',
  })
  @ApiResponse({
    status: 200,
    description: 'Resume validations retrieved successfully.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Only referrers can access.' })
  @ApiResponse({ status: 404, description: 'Resume section not found or access denied.' })
  async getResumeValidations(
    @Param('resumeId') resumeId: string,
    @Request() req: any,
  ) {
    const referrerId = req.user.id;

    // First, verify the resume section exists
    const resumeSection = await this.resumeService.getResumeSection(resumeId);
    if (!resumeSection) {
      return {
        success: false,
        data: null,
        message: 'Resume section not found',
      };
    }

    const candidateId = resumeSection.userId;

    // Verify that the referrer has access to this candidate through deck relationship
    const hasAccess = await this.resumeService.canAccessCandidateResume(referrerId, candidateId);
    if (!hasAccess) {
      return {
        success: false,
        data: null,
        message: 'Access denied. Candidate not found in your deck.',
      };
    }

    const validations = await this.resumeService.getResumeValidations(resumeId);

    return {
      success: true,
      data: validations,
      message: 'Validations retrieved successfully',
    };
  }

  @Delete(':validationId')
  @Roles(UserRole.REFERRER)
  @ApiOperation({
    summary: 'Delete Resume Validation',
    description: 'Referrer deletes their own validation.',
  })
  @ApiParam({
    name: 'validationId',
    description: 'ID of the validation to delete',
  })
  @ApiResponse({
    status: 200,
    description: 'Resume validation deleted successfully.',
  })
  async deleteValidation(
    @Param('validationId') validationId: string,
    @Request() req: any,
  ) {
    const referrerId = req.user.id;

    // First, verify the validation belongs to the referrer
    const validation = await this.resumeService.getValidationById(validationId);
    if (!validation || validation.referrerId !== referrerId) {
      return {
        success: false,
        data: null,
        message: 'Validation not found or access denied',
      };
    }

    const success = await this.resumeService.deactivateValidation(validationId);

    if (success) {
      return {
        success: true,
        data: null,
        message: 'Validation deleted successfully',
      };
    } else {
      return {
        success: false,
        data: null,
        message: 'Failed to delete validation',
      };
    }
  }
}
