import { Body, Controller, Delete, Get, Param, Post, Put, Request, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags, ApiConsumes } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../common/enums/user-role.enum';
import { ResumeSectionType } from '../entities/resume.entity';
import { ResumeService } from './resume.service';
import { NotFoundException } from '@nestjs/common';

@ApiTags('resume')
@Controller('resume')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ResumeController {
    constructor(private readonly resumeService: ResumeService) { }

    @Get('candidate/:candidateId/resume')
    @Roles(UserRole.REFERRER)
    @ApiOperation({
        summary: 'Get Candidate Resume (Referrer Only)',
        description: 'Referrer retrieves a candidate\'s complete resume information. Only accessible if the candidate is in the referrer\'s deck.',
    })
    @ApiResponse({
        status: 200,
        description: 'Successfully retrieved candidate resume information.',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean' },
                data: {
                    type: 'object',
                    properties: {
                        professionalSummary: {
                            type: 'object',
                            nullable: true,
                            properties: {
                                id: { type: 'string' },
                                summary: { type: 'string' }
                            }
                        },
                        workExperience: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    id: { type: 'string' },
                                    title: { type: 'string' },
                                    company: { type: 'string' },
                                    dateRange: { type: 'string' },
                                    description: { type: 'string' },
                                    order: { type: 'number' }
                                }
                            }
                        },
                        education: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    id: { type: 'string' },
                                    degreeType: { type: 'string' },
                                    fieldOfStudy: { type: 'string' },
                                    institution: { type: 'string' },
                                    startYear: { type: 'number' },
                                    endYear: { type: 'number' },
                                    description: { type: 'string' },
                                    order: { type: 'number' }
                                }
                            }
                        },
                        skills: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    id: { type: 'string' },
                                    skillName: { type: 'string' },
                                    order: { type: 'number' }
                                }
                            }
                        },
                        awards: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    id: { type: 'string' },
                                    awardName: { type: 'string' },
                                    issuingOrganization: { type: 'string' },
                                    dateAwarded: { type: 'string' },
                                    description: { type: 'string' },
                                    order: { type: 'number' }
                                }
                            }
                        }
                    }
                }
            }
        }
    })
    @ApiResponse({ status: 401, description: 'Unauthorized.' })
    @ApiResponse({ status: 403, description: 'Forbidden. Only referrers can access.' })
    @ApiResponse({ status: 404, description: 'Candidate not found or access denied.' })
    async getCandidateResume(
        @Param('candidateId') candidateId: string,
        @Request() req: any
    ) {
        const referrerId = req.user.id;
        
        console.log(`🔍 getCandidateResume called: referrerId=${referrerId}, candidateId=${candidateId}`);
        
        // 권한 확인: Deck 관계가 존재하는지 확인
        const hasAccess = await this.resumeService.canAccessCandidateResume(referrerId, candidateId);
        console.log(`🔐 Access check result: ${hasAccess}`);
        
        if (!hasAccess) {
            console.log(`❌ Access denied for referrer ${referrerId} to candidate ${candidateId}`);
            throw new NotFoundException('Candidate not found or access denied');
        }

        console.log(`✅ Access granted, fetching resume for candidate ${candidateId}`);
        const structuredResume = await this.resumeService.getStructuredResume(candidateId);

        return {
            success: true,
            data: structuredResume,
        };
    }

    @Get('sections')
    @Roles(UserRole.CANDIDATE)
    @ApiOperation({
        summary: 'Supported Resume Sections List',
        description: 'Retrieve all resume section types supported by the server.',
    })
    @ApiResponse({
        status: 200,
        description: 'Successfully retrieved supported sections list.',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean' },
                data: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            type: { type: 'string' },
                            name: { type: 'string' }
                        }
                    }
                }
            }
        }
    })
    async getSupportedSections() {
        const sections = [
            { type: ResumeSectionType.PROFESSIONAL_SUMMARY, name: 'Professional Summary' },
            { type: ResumeSectionType.WORK_EXPERIENCE, name: 'Work Experience' },
            { type: ResumeSectionType.EDUCATION, name: 'Education' },
            { type: ResumeSectionType.SKILLS, name: 'Skills' },
            { type: ResumeSectionType.AWARDS_AND_CERTIFICATIONS, name: 'Awards & Certifications' }
        ];

        return {
            success: true,
            data: sections
        };
    }

    @Get('my-resume')
    @Roles(UserRole.CANDIDATE)
    @ApiOperation({
        summary: 'Get My Complete Resume',
        description: 'Candidate retrieves their complete resume information in structured format.',
    })
    @ApiResponse({
        status: 200,
        description: 'Successfully retrieved complete resume information.',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean' },
                data: {
                    type: 'object',
                    properties: {
                        professionalSummary: {
                            type: 'object',
                            nullable: true,
                            properties: {
                                id: { type: 'string' },
                                summary: { type: 'string' }
                            }
                        },
                        workExperience: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    id: { type: 'string' },
                                    title: { type: 'string' },
                                    company: { type: 'string' },
                                    dateRange: { type: 'string' },
                                    description: { type: 'string' },
                                    order: { type: 'number' }
                                }
                            }
                        },
                        education: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    id: { type: 'string' },
                                    degreeType: { type: 'string' },
                                    fieldOfStudy: { type: 'string' },
                                    institution: { type: 'string' },
                                    startYear: { type: 'number' },
                                    endYear: { type: 'number' },
                                    description: { type: 'string' },
                                    order: { type: 'number' }
                                }
                            }
                        },
                        skills: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    id: { type: 'string' },
                                    skillName: { type: 'string' },
                                    order: { type: 'number' }
                                }
                            }
                        },
                        awards: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    id: { type: 'string' },
                                    awardName: { type: 'string' },
                                    issuingOrganization: { type: 'string' },
                                    dateAwarded: { type: 'string' },
                                    description: { type: 'string' },
                                    order: { type: 'number' }
                                }
                            }
                        }
                    }
                }
            }
        }
    })
    async getMyCompleteResume(@Request() req: any) {
        const userId = req.user.id;
        const structuredResume = await this.resumeService.getStructuredResume(userId);

        return {
            success: true,
            data: structuredResume,
        };
    }

    @Get('section/:sectionType')
    @Roles(UserRole.CANDIDATE)
    @ApiOperation({
        summary: 'Get Resume Section by Type',
        description: 'Candidate retrieves a specific type of resume section.',
    })
    @ApiParam({
        name: 'sectionType',
        enum: ResumeSectionType,
        description: 'Type of resume section to retrieve',
    })
    @ApiResponse({
        status: 200,
        description: 'Successfully retrieved resume section.',
    })
    async getResumeSectionByType(
        @Param('sectionType') sectionType: ResumeSectionType,
        @Request() req: any,
    ) {
        const userId = req.user.id;
        const section = await this.resumeService.getResumeSectionByType(userId, sectionType);

        if (!section) {
            return {
                success: false,
                data: null,
                message: 'Resume section not found',
            };
        }

        return {
            success: true,
            data: section,
        };
    }

    @Put('section/:id')
    @Roles(UserRole.CANDIDATE)
    @ApiOperation({
        summary: 'Update Resume Section',
        description: 'Candidate updates a specific resume section.',
    })
    @ApiParam({
        name: 'id',
        description: 'ID of the resume section to update',
    })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                sectionData: {
                    type: 'object',
                    description: 'Section data to update',
                },
                sectionOrder: {
                    type: 'number',
                    description: 'New section order',
                },
            },
        },
    })
    @ApiResponse({
        status: 200,
        description: 'Resume section updated successfully.',
    })
    async updateResumeSection(
        @Param('id') id: string,
        @Body() updateSectionDto: {
            sectionData?: Record<string, any>;
            sectionOrder?: number;
        },
        @Request() req: any,
    ) {
        const updatedSection = await this.resumeService.updateResumeSection(
            id,
            updateSectionDto,
        );

        if (!updatedSection) {
            return {
                success: false,
                data: null,
                message: 'Resume section not found',
            };
        }

        return {
            success: true,
            data: updatedSection,
        };
    }

    @Delete('section/:id')
    @Roles(UserRole.CANDIDATE)
    @ApiOperation({
        summary: 'Deactivate Resume Section',
        description: 'Candidate deactivates a specific resume section.',
    })
    @ApiParam({
        name: 'id',
        description: 'ID of the resume section to deactivate',
    })
    @ApiResponse({
        status: 200,
        description: 'Resume section deactivated successfully.',
    })
    async deactivateResumeSection(
        @Param('id') id: string,
        @Request() req: any,
    ) {
        const success = await this.resumeService.deactivateResumeSection(id);

        return {
            success,
            message: success ? 'Resume section deactivated successfully' : 'Failed to deactivate resume section',
        };
    }

    @Delete('my-resume')
    @Roles(UserRole.CANDIDATE)
    @ApiOperation({
        summary: 'Delete Complete Resume',
        description: 'Candidate deactivates all their resume sections at once.',
    })
    @ApiResponse({
        status: 200,
        description: 'Complete resume deleted successfully.',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean' },
                message: { type: 'string' },
                data: {
                    type: 'object',
                    properties: {
                        count: { type: 'number', description: 'Number of deleted sections' }
                    }
                }
            }
        }
    })
    async deleteMyCompleteResume(@Request() req: any) {
        const userId = req.user.id;
        const result = await this.resumeService.deactivateAllUserResumeSections(userId);

        if (result.success) {
            if (result.count > 0) {
                return {
                    success: true,
                    message: `Complete resume deleted successfully. (${result.count} sections)`,
                    data: { count: result.count }
                };
            } else {
                return {
                    success: true,
                    message: 'No resume sections to delete.',
                    data: { count: 0 }
                };
            }
        } else {
            return {
                success: false,
                message: 'Error occurred while deleting resume.',
                data: { count: 0 }
            };
        }
    }

    @Post('parse-pdf')
    @Roles(UserRole.CANDIDATE)
    @ApiOperation({
        summary: 'Parse PDF Resume and Create Sections',
        description: 'Upload a PDF resume file and automatically create resume sections using Gemini AI.',
    })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                file: {
                    type: 'string',
                    format: 'binary',
                    description: 'PDF resume file to parse',
                },
            },
        },
    })
    @ApiResponse({
        status: 201,
        description: 'PDF parsed successfully and resume sections created.',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean' },
                message: { type: 'string' },
                data: {
                    type: 'object',
                    properties: {
                        summaryCreated: { type: 'boolean' },
                        workExperienceCount: { type: 'number' },
                        educationCount: { type: 'number' },
                        totalSections: { type: 'number' }
                    }
                }
            }
        }
    })
    @ApiResponse({
        status: 400,
        description: 'Invalid file format or processing error.',
    })
    @UseInterceptors(FileInterceptor('file'))
    async parsePdfResume(
        @UploadedFile() file: Express.Multer.File,
        @Request() req: any,
    ) {
        if (!file) {
            return {
                success: false,
                message: 'No file uploaded',
            };
        }

        // PDF 파일 검증
        if (file.mimetype !== 'application/pdf') {
            return {
                success: false,
                message: 'Only PDF files are allowed',
            };
        }

        // 파일 크기 제한 (10MB)
        if (file.size > 10 * 1024 * 1024) {
            return {
                success: false,
                message: 'File size must be less than 10MB',
            };
        }

        const userId = req.user.id;
        const result = await this.resumeService.parsePdfAndCreateSections(userId, file.buffer);

        return result;
    }


}
