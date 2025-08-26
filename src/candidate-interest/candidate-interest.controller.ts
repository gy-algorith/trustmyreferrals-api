import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Request,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { CandidateInterestService } from './candidate-interest.service';
import { CreateCandidateInterestDto } from './dto/create-candidate-interest.dto';
import { CandidateInterestDto } from './dto/candidate-interest.dto';
import { ApiResponseDto } from '../common/dto/api-response.dto';

@ApiTags('candidate-interest')
@Controller('candidate-interest')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class CandidateInterestController {
  constructor(
    private readonly candidateInterestService: CandidateInterestService,
  ) {}

  @Post()
  @Roles(UserRole.REFERRER)
  @ApiOperation({
    summary: 'Create Candidate Interest (Referrer Only)',
    description: 'Referrer creates a position offer for a candidate. Only referrers can create offers.',
  })
  @ApiResponse({
    status: 201,
    description: 'Candidate interest created successfully.',
    type: CandidateInterestDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request - invalid data or duplicate offer.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Only referrers can create offers.' })
  @ApiResponse({ status: 404, description: 'Candidate not found.' })
  async create(
    @Body() createDto: CreateCandidateInterestDto,
    @Request() req: any,
  ): Promise<ApiResponseDto<CandidateInterestDto>> {
    console.log('🎯 Candidate Interest create method called');
    console.log('📝 Request body:', createDto);
    console.log('👤 Referrer ID:', req.user.id);
    
    const referrerId = req.user.id;
    const interest = await this.candidateInterestService.create(createDto, referrerId);

    return {
      success: true,
      message: 'Candidate interest created successfully',
      data: interest,
    };
  }

  @Get()
  @ApiOperation({
    summary: 'Get All Candidate Interests',
    description: 'Retrieves candidate interests based on user role. Referrers see their offers, candidates see offers they received.',
  })
  @ApiResponse({
    status: 200,
    description: 'Candidate interests retrieved successfully.',
    type: [CandidateInterestDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Insufficient permissions.' })
  async findAll(@Request() req: any): Promise<ApiResponseDto<CandidateInterestDto[]>> {
    const userId = req.user.id;
    const userRole = req.user.role;
    
    const interests = await this.candidateInterestService.findAll(userId, userRole);

    return {
      success: true,
      message: 'Candidate interests retrieved successfully',
      data: interests,
    };
  }

  @Post(':id/approve')
  @Roles(UserRole.CANDIDATE)
  @ApiOperation({
    summary: 'Approve Candidate Interest (Candidate Only)',
    description: 'Candidate approves a position offer. Only the candidate who received the offer can approve it.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID of the candidate interest to approve',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Candidate interest approved successfully.',
    type: CandidateInterestDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request - interest cannot be approved.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Only candidates can approve offers.' })
  @ApiResponse({ status: 404, description: 'Candidate interest not found.' })
  async approve(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<ApiResponseDto<CandidateInterestDto>> {
    const userId = req.user.id;
    const interest = await this.candidateInterestService.approve(id, userId);

    return {
      success: true,
      message: 'Candidate interest approved successfully',
      data: interest,
    };
  }

  @Post(':id/reject')
  @Roles(UserRole.CANDIDATE)
  @ApiOperation({
    summary: 'Reject Candidate Interest (Candidate Only)',
    description: 'Candidate rejects a position offer. Only the candidate who received the offer can reject it.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID of the candidate interest to reject',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Candidate interest rejected successfully.',
    type: CandidateInterestDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request - interest cannot be rejected.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Only candidates can reject offers.' })
  @ApiResponse({ status: 404, description: 'Candidate interest not found.' })
  async reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<ApiResponseDto<CandidateInterestDto>> {
    const userId = req.user.id;
    const interest = await this.candidateInterestService.reject(id, userId);

    return {
      success: true,
      message: 'Candidate interest rejected successfully',
      data: interest,
    };
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get Specific Candidate Interest',
    description: 'Retrieves a specific candidate interest by ID. Access is restricted based on user role.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID of the candidate interest to retrieve',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Candidate interest retrieved successfully.',
    type: CandidateInterestDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Access denied to this interest.' })
  @ApiResponse({ status: 404, description: 'Candidate interest not found.' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<ApiResponseDto<CandidateInterestDto>> {
    const userId = req.user.id;
    const userRole = req.user.role;
    
    const interest = await this.candidateInterestService.findOne(id, userId, userRole);

    return {
      success: true,
      message: 'Candidate interest retrieved successfully',
      data: interest,
    };
  }
}
