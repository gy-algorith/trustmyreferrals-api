import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { UserUpdatesService } from './user-updates.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { UserUpdateResponseDto } from './dto/user-update-response.dto';
import { PaginatedUserUpdatesResponseDto } from './dto/paginated-user-updates-response.dto';
import { ApiResponse as ApiResponseInterface, ApiArrayResponse } from '../common/interfaces/api-response.interface';

@ApiTags('user-updates')
@Controller('user-updates')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class UserUpdatesController {
  constructor(private readonly userUpdatesService: UserUpdatesService) {}

  @Post('post')
  @Roles(UserRole.CANDIDATE)
  @ApiOperation({
    summary: 'Create Post',
    description: 'Candidate creates a new post.',
  })
  @ApiBody({ type: CreatePostDto })
  @ApiResponse({
    status: 201,
    description: 'Post created successfully.',
    type: UserUpdateResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized request.',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden. Only candidates can create posts.',
  })
  async createPost(
    @Body() createPostDto: CreatePostDto,
    @Request() req: any,
  ): Promise<ApiResponseInterface<UserUpdateResponseDto>> {
    const userId = req.user.id;
    const update = await this.userUpdatesService.createPost(
      userId,
      createPostDto.description,
    );
    return {
      success: true,
      data: this.mapToResponseDto(update),
    };
  }

  @Get('my-updates')
  @Roles(UserRole.CANDIDATE)
  @ApiOperation({
    summary: 'My Updates',
    description: 'Get all updates created by the current user.',
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
    description: 'Updates retrieved successfully.',
    type: PaginatedUserUpdatesResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized request.',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden. Only candidates can access this endpoint.',
  })
  async getMyUpdates(
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 20,
    @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
    @Request() req: any,
  ): Promise<ApiResponseInterface<PaginatedUserUpdatesResponseDto>> {
    const userId = req.user.id;
    const result = await this.userUpdatesService.getUpdatesByUser(userId, page, limit);
    
    return {
      success: true,
      data: {
        updates: result.updates.map(update => this.mapToResponseDto(update)),
        total: result.total,
        limit,
        page,
      },
    };
  }

  @Get('referrer')
  @Roles(UserRole.REFERRER)
  @ApiOperation({
    summary: 'Referrer Updates',
    description: 'Get updates from candidates in my deck.',
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
    description: 'Updates retrieved successfully.',
    type: PaginatedUserUpdatesResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized request.',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden. Only referrers can access this endpoint.',
  })
  async getReferrerUpdates(
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 20,
    @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
    @Request() req: any,
  ): Promise<ApiResponseInterface<PaginatedUserUpdatesResponseDto>> {
    const referrerId = req.user.id;
    const result = await this.userUpdatesService.getUpdatesForReferrer(referrerId, page, limit);
    
    return {
      success: true,
      data: {
        updates: result.updates.map(update => this.mapToResponseDtoWithUser(update)),
        total: result.total,
        limit,
        page,
      },
    };
  }

  @Put(':id')
  @Roles(UserRole.CANDIDATE)
  @ApiOperation({
    summary: 'Update Post',
    description: 'Update a post created by the current user.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID of the update to modify',
    type: String,
  })
  @ApiBody({ type: UpdatePostDto })
  @ApiResponse({
    status: 200,
    description: 'Post updated successfully.',
    type: UserUpdateResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized request.',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden. Only the author can modify the post.',
  })
  @ApiResponse({
    status: 404,
    description: 'Update not found.',
  })
  async updatePost(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updatePostDto: UpdatePostDto,
    @Request() req: any,
  ): Promise<ApiResponseInterface<UserUpdateResponseDto>> {
    const userId = req.user.id;
    const update = await this.userUpdatesService.updateUpdate(
      id,
      userId,
      updatePostDto,
    );
    
    if (!update) {
      throw new Error('Update not found or you do not have permission to modify it');
    }
    
    return {
      success: true,
      data: this.mapToResponseDto(update),
    };
  }

  private mapToResponseDto(update: any): UserUpdateResponseDto {
    return {
      id: update.id,
      updateType: update.updateType,
      description: update.description,
      metadata: update.metadata,
      createdAt: update.createdAt,
      updatedAt: update.updatedAt,
    };
  }

  private mapToResponseDtoWithUser(update: any): UserUpdateResponseDto & { user: any } {
    return {
      ...this.mapToResponseDto(update),
      user: update.user ? {
        id: update.user.id,
        firstName: update.user.firstName,
        lastName: update.user.lastName,
        email: update.user.email,
      } : undefined,
    };
  }
}
