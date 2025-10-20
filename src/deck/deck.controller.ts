import { Controller, Get, UseGuards, Request, Query, ParseIntPipe, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { DeckService } from './deck.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';

@ApiTags('deck')
@Controller('deck')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class DeckController {
  constructor(
    private readonly deckService: DeckService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  @Get('my-deck')
  @Roles(UserRole.REFERRER)
  @ApiOperation({
    summary: 'Get My Deck',
    description: 'Retrieve the list of candidates invited by the referrer.',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of items per page (default: 20)',
    type: Number,
  })
  @ApiQuery({
    name: 'excludeRequirementId',
    required: false,
    description: 'If provided, exclude candidates already registered in this requirement responses',
    type: String,
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number (default: 1)',
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved deck list.',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              candidateId: { type: 'string', description: 'Candidate user ID' },
              name: { type: 'string' },
              resume: { 
                type: 'object',
                additionalProperties: { type: 'array', items: { type: 'object' } },
                description: 'Aggregated resume sections (by sectionType)'
              },
              inDecks: { type: 'number' },
              dateAdded: { type: 'string', format: 'date-time' },
              isPremium: { type: 'boolean' },
              email: { type: 'string' },
              status: { type: 'string' },
              isExisting: { type: 'boolean', description: 'Whether candidate already exists in the specified requirement' },
            },
          },
        },
        total: { type: 'number' },
        limit: { type: 'number' },
        page: { type: 'number' },
        cap: {
          type: 'object',
          properties: {
            total: { type: 'number', description: 'Total candidate cap (0 or null means unlimited)' },
            used: { type: 'number', description: 'Number of purchased candidates' },
            remaining: { type: 'number', description: 'Remaining candidate slots' },
            isUnlimited: { type: 'boolean', description: 'Whether the plan has unlimited candidates' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized request.',
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions. Only referrers can access.',
  })
  @ApiResponse({
    status: 404,
    description: 'Referrer information not found.',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error occurred.',
  })
  async getMyDeck(
    @Query('page') page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 20,
    @Query('excludeRequirementId') excludeRequirementId: string | undefined,
    @Request() req: any,
  ) {
    try {
      const userId = req.user.id;
      console.log('🔍 Fetching deck for user:', userId);
      
      // Find user and verify it's a referrer
      const user = await this.userRepository.findOne({
        where: { id: userId }
      });
      
      if (!user || user.role !== UserRole.REFERRER) {
        console.log('❌ Referrer not found for user:', userId);
        throw new HttpException(
          {
            success: false,
            message: 'Referrer not found',
            error: 'NOT_FOUND'
          },
          HttpStatus.NOT_FOUND
        );
      }
      
      console.log('✅ Found referrer:', user.id);
      const deckItems = await this.deckService.getDeckSummaryByReferrer(user.id, excludeRequirementId);
      console.log('📊 Found deck items:', deckItems.length);
      
      // Apply pagination
      const total = deckItems.length;
      const offset = (page - 1) * limit;
      const paginatedItems = deckItems.slice(offset, offset + limit);
      
      // 사용자의 cap 정보와 현재 purchased candidates 수 가져오기
      const referrerCandidateCap = user.candidateCap || 0;
      const referrerPurchasedCandidates = user.purchasedCandidates || 0;
      
      return {
        success: true,
        data: paginatedItems,
        total,
        limit,
        page,
        cap: {
          total: referrerCandidateCap,
          used: referrerPurchasedCandidates,
          remaining: Math.max(0, referrerCandidateCap - referrerPurchasedCandidates),
          isUnlimited: referrerCandidateCap === null || referrerCandidateCap === 0, // ENTERPRISE 플랜 등
        },
      };
      
    } catch (error) {
      console.error('🚨 Error in getMyDeck:', error);
      
      // Re-throw HttpException
      if (error instanceof HttpException) {
        throw error;
      }
      
      // Handle other errors as 500
      throw new HttpException(
        {
          success: false,
          message: 'Get deck failed',
          error: 'INTERNAL_SERVER_ERROR'
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('my-referrers')
  @Roles(UserRole.CANDIDATE)
  @ApiOperation({
    summary: 'Get My Referrers',
    description: 'Retrieve the list of referrers who have added the candidate to their deck.',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of items per page (default: 20)',
    type: Number,
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number (default: 1)',
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved referrers list.',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              referrerName: { type: 'string', description: 'Name of the referrer' },
              submissions: { type: 'number', description: 'Number of times this referrer submitted the candidate' },
              lastSubmitted: { type: 'string', format: 'date-time', description: 'Last submission date' },
              dateConnected: { type: 'string', format: 'date-time', description: 'Date when connected (deck created)' },
            },
          },
        },
        total: { type: 'number' },
        limit: { type: 'number' },
        page: { type: 'number' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized request.',
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions. Only candidates can access.',
  })
  @ApiResponse({
    status: 404,
    description: 'Candidate information not found.',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error occurred.',
  })
  async getMyReferrers(
    @Query('page') page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 20,
    @Request() req: any,
  ) {
    try {
      const userId = req.user.id;
      console.log('🔍 Fetching referrers for candidate:', userId);
      
      // Find user and verify it's a candidate
      const user = await this.userRepository.findOne({
        where: { id: userId }
      });
      
      if (!user || user.role !== UserRole.CANDIDATE) {
        console.log('❌ Candidate not found for user:', userId);
        throw new HttpException(
          {
            success: false,
            message: 'Candidate not found',
            error: 'NOT_FOUND'
          },
          HttpStatus.NOT_FOUND
        );
      }
      
      console.log('✅ Found candidate:', user.id);
      const referrersData = await this.deckService.getReferrersByCandidate(user.id);
      console.log('📊 Found referrers data:', referrersData.length);
      
      // Apply pagination
      const total = referrersData.length;
      const offset = (page - 1) * limit;
      const paginatedItems = referrersData.slice(offset, offset + limit);
      
      return {
        success: true,
        data: paginatedItems,
        total,
        limit,
        page,
      };
      
    } catch (error) {
      console.error('🚨 Error in getMyReferrers:', error);
      
      // Re-throw HttpException
      if (error instanceof HttpException) {
        throw error;
      }
      
      // Handle other errors as 500
      throw new HttpException(
        {
          success: false,
          message: 'Get referrers failed',
          error: 'INTERNAL_SERVER_ERROR'
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
