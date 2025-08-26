import { Body, ClassSerializerInterceptor, Controller, Get, Param, Post, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiQuery, ApiResponse, ApiTags, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { User } from '../common/decorators/user.decorator';
import { ApiResponseDto } from '../common/dto/api-response.dto';
import { CreateRequirementDto } from './dto/create-requirement.dto';
import { RequirementDto } from './dto/requirement.dto';
import { SearchRequirementDto } from './dto/search-requirement.dto';
import { RequirementsService } from './services/requirements.service';
import { CreateRequirementReportDto } from './dto/create-requirement-report.dto';
import { CreateRequirementResponseDto } from './dto/create-requirement-response.dto';
import { RequirementResponseService } from './services/requirement-response.service';
import { RequirementResponseDto } from './dto/requirement-response.dto';
import { RequirementResponseStatus } from '../entities/requirement-response.entity';

@ApiTags('Requirements')
@Controller('requirements')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(ClassSerializerInterceptor)
export class RequirementsController {
  constructor(
    private readonly requirementsService: RequirementsService,
    private readonly requirementResponseService: RequirementResponseService,
  ) {}

  @Post()
  @Roles(UserRole.REFERRER)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Create a new job requirement', 
    description: 'Allows a referrer to post a new job requirement.' 
  })
  @ApiBody({ type: CreateRequirementDto })
  @ApiResponse({ 
    status: 201, 
    description: 'Job requirement created successfully.', 
    type: RequirementDto 
  })
  @ApiResponse({ status: 400, description: 'Bad Request. Invalid input data.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async create(
    @Body() createRequirementDto: CreateRequirementDto,
    @User() user: { id: string },
  ): Promise<ApiResponseDto<RequirementDto>> {
    const requirement = await this.requirementsService.create(createRequirementDto, user.id);
    const data = plainToInstance(RequirementDto, requirement, { excludeExtraneousValues: true });
    return { success: true, message: 'Job requirement created successfully.', data: data };
  }

  @Get('my-requirements')
  @Roles(UserRole.REFERRER)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Get my requirements with response statistics', 
    description: 'Retrieves all requirements created by the current referrer user with response counts and statistics.' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'My requirements fetched successfully with response statistics.' 
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Only referrers can access.' })
  async getMyRequirements(
    @User() user: { id: string },
  ): Promise<ApiResponseDto<any>> {
    const myRequirements = await this.requirementsService.getMyRequirements(user.id);
    return { 
      success: true, 
      message: 'My requirements fetched successfully.', 
      data: myRequirements 
    };
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Get a specific job requirement', 
    description: 'Retrieves a specific job requirement by its ID with response count.' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Job requirement fetched successfully.', 
    type: RequirementDto 
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Not Found.' })
  async findOne(
    @Param('id') id: string,
  ): Promise<ApiResponseDto<RequirementDto & { responseCount: number }>> {
    const requirement = await this.requirementsService.findOne(id);
    const responseCount = await this.requirementResponseService.getResponseCount(id);
    
    const data = plainToInstance(RequirementDto, requirement, { excludeExtraneousValues: true });
    return { 
      success: true, 
      message: 'Job requirement fetched successfully.', 
      data: { ...data, responseCount } 
    };
  }

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Search for job requirements', 
    description: 'Searches for open job requirements based on various filter criteria. Excludes requirements created by the current user.' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Job requirements fetched successfully.', 
    type: [RequirementDto] 
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async search(
    @Query() searchRequirementDto: SearchRequirementDto,
    @User() user: { id: string },
  ): Promise<ApiResponseDto<RequirementDto[]>> {
    const requirements = await this.requirementsService.search(searchRequirementDto, user.id);
    const data = plainToInstance(RequirementDto, requirements, { excludeExtraneousValues: true });
    return { success: true, message: 'Job requirements fetched successfully.', data: data };
  }

  @Post(':id/report')
  @Roles(UserRole.REFERRER)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Report a job requirement', 
    description: 'Allows a referrer to report a questionable job requirement.' 
  })
  @ApiResponse({ status: 201, description: 'Report submitted successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden to report own post.' })
  @ApiResponse({ status: 404, description: 'Job requirement not found.' })
  @ApiResponse({ status: 409, description: 'Conflict, already reported.' })
  async report(
    @Param('id') id: string,
    @User() user: { id: string },
    @Body() createReportDto: CreateRequirementReportDto,
  ): Promise<ApiResponseDto<null>> {
    await this.requirementsService.report(id, user.id, createReportDto);
    return { success: true, message: 'Report submitted successfully.', data: null };
  }

  @Post(':id/respond')
  @Roles(UserRole.REFERRER)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Requirement에 후보자 제안', 
    description: '내 덱의 후보자를 선택해 requirement에 제안(응답)합니다. 자신이 작성한 requirement에는 응답할 수 없습니다.' 
  })
  @ApiBody({ type: CreateRequirementResponseDto })
  @ApiResponse({ status: 201, description: '응답 생성 성공', type: RequirementResponseDto })
  async respond(
    @Param('id') requirementId: string,
    @Body() dto: CreateRequirementResponseDto,
    @User() user: { id: string },
  ): Promise<ApiResponseDto<RequirementResponseDto>> {
    const response = await this.requirementResponseService.create(requirementId, dto, user.id);
    return { success: true, message: 'Response created', data: response };
  }

  @Get(':id/responses')
  @Roles(UserRole.REFERRER)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Get paginated responses for a requirement', 
    description: 'Returns a paginated list of responses for a requirement. Only the author can view responses.' 
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of items per page (default: 10)' })
  @ApiQuery({ 
    name: 'status', 
    required: false, 
    enum: RequirementResponseStatus, 
    description: 'Filter by response status (default: pending)' 
  })
  @ApiResponse({ status: 200, description: 'Paginated response list', type: [RequirementResponseDto] })
  async getResponses(
    @Param('id') requirementId: string,
    @User() user: { id: string },
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('status') status: RequirementResponseStatus = RequirementResponseStatus.PENDING,
  ): Promise<ApiResponseDto<RequirementResponseDto[]>> {
    const responses = await this.requirementResponseService.findResponses(
      requirementId, 
      user.id, 
      Number(page), 
      Number(limit),
      status
    );
    return { success: true, message: 'Response list', data: responses };
  }

  @Post(':requirementId/responses/:responseId/approve')
  @Roles(UserRole.REFERRER)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: '응답 승인 및 잔액 차감', 
    description: '응답(후보자 제안) 승인과 동시에 사용자 잔액에서 구매 가격 차감' 
  })
  @ApiResponse({ status: 200, description: '응답 승인 및 잔액 차감 성공' })
  async approveResponse(
    @Param('requirementId') requirementId: string,
    @Param('responseId') responseId: string,
    @User() user: { id: string },
  ): Promise<ApiResponseDto<any>> {
    const result = await this.requirementResponseService.approve(
      requirementId, 
      responseId, 
      user.id
    );
    return { success: true, message: 'Response approved and balance deducted', data: result };
  }

  @Post(':requirementId/responses/:responseId/reject')
  @Roles(UserRole.REFERRER)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: '응답 거절', 
    description: '응답(후보자 제안) 거절' 
  })
  @ApiResponse({ status: 200, description: '응답 거절' })
  async rejectResponse(
    @Param('requirementId') requirementId: string,
    @Param('responseId') responseId: string,
    @User() user: { id: string },
  ): Promise<ApiResponseDto<any>> {
    const result = await this.requirementResponseService.reject(
      requirementId, 
      responseId, 
      user.id
    );
    return { success: true, message: 'Response rejected', data: result };
  }

  @Post(':id/close')
  @Roles(UserRole.REFERRER)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Close a job requirement', 
    description: 'Closes a job requirement by setting its status to CLOSED. Only the author can close their own requirements.' 
  })
  @ApiParam({
    name: 'id',
    description: 'ID of the requirement to close',
    type: 'string',
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Requirement closed successfully.',
    type: RequirementDto 
  })
  @ApiResponse({ status: 400, description: 'Bad Request. Requirement is already closed.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Only the author can close requirements.' })
  @ApiResponse({ status: 404, description: 'Requirement not found.' })
  async closeRequirement(
    @Param('id') id: string,
    @User() user: { id: string },
  ): Promise<ApiResponseDto<RequirementDto>> {
    const requirement = await this.requirementsService.closeRequirement(id, user.id);
    const data = plainToInstance(RequirementDto, requirement, { excludeExtraneousValues: true });
    return { 
      success: true, 
      message: 'Requirement closed successfully.', 
      data: data 
    };
  }
} 