import { Controller, Get, Post, Query, Body, UseGuards, Request, Delete, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags, ApiQuery, ApiBody, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { CircleService } from './circle.service';
import { ApiResponseDto } from '../common/dto/api-response.dto';
import cryptoRandomString from 'crypto-random-string';

@ApiTags('circle')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('circle')
export class CircleController {
  constructor(private readonly circleService: CircleService) {}

  @Get('search')
  @Roles(UserRole.REFERRER)
  @ApiOperation({ summary: 'Search referrers by name or email', description: 'Searches referrers by their first/last name or email (partial match).' })
  @ApiQuery({ name: 'q', required: true, type: String, description: 'Search keyword (name or email)', example: 'john' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Max items to return (default: 20)', example: 20 })
  @ApiResponse({ status: 200, description: 'Matched referrers', schema: { example: { success: true, data: [{ id: 'uuid', firstName: 'John', lastName: 'Doe', email: 'john@example.com' }] } } })
  async search(@Query('q') q: string, @Query('limit') limit = 20): Promise<ApiResponseDto<any>> {
    const data = await this.circleService.searchReferrers(q, Number(limit));
    return { success: true, data };
  }

  @Post('invite')
  @Roles(UserRole.REFERRER)
  @ApiOperation({ summary: 'Create invite link for a referrer', description: 'Creates a circle invite for the specified referrer and returns an invite URL and record.' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        accepterId: { type: 'string', description: 'User ID of the referrer to invite', example: 'c7e1f2a0-1234-4567-89ab-0e1d2c3b4a5f' }
      },
      required: ['accepterId']
    }
  })
  @ApiResponse({ status: 201, description: 'Invite link created', schema: { example: { success: true, data: { url: 'https://app/circle/invite/xxxx', invite: { id: 'uuid', inviterId: 'uuid', accepterId: 'uuid', status: 'pending' } } } } })
  async invite(@Request() req: any, @Body() body: { accepterId: string }): Promise<ApiResponseDto<any>> {
    const invite = await this.circleService.createOrReuseInvite(req.user.id, body.accepterId);
    const token = invite.inviteToken;
    const url = `${process.env.FRONTEND_URL ?? 'http://localhost:3000/'}en/accept-circle-invite?token=${token}`;
    return { success: true, data: { url, invite } };
  }

  @Get('pending')
  @Roles(UserRole.REFERRER)
  @ApiOperation({ summary: 'Get my pending invites', description: 'Lists invites the current referrer has received that are still pending.' })
  @ApiResponse({ status: 200, description: 'Pending invites', schema: { example: { success: true, data: [{ id: 'uuid', inviterId: 'uuid', accepterId: 'uuid', status: 'pending', inviteToken: 'xxxx', tokenExpiresAt: '2025-09-01T00:00:00.000Z' }] } } })
  async pending(@Request() req: any): Promise<ApiResponseDto<any>> {
    const pending = await this.circleService.getPendingInvites(req.user.id);
    return { success: true, data: pending };
  }

  @Get('validate-invite')
  @Roles(UserRole.REFERRER)
  @ApiOperation({ summary: 'Validate invite token for current referrer' })
  @ApiQuery({ name: 'token', required: true, type: String, description: 'Invite token to validate' })
  @ApiResponse({ status: 200, description: 'Validation result', schema: { example: { success: true, data: { isValid: true, inviteId: 'uuid', inviter: { id: 'uuid', firstName: 'John', lastName: 'Doe', email: 'john@example.com' }, status: 'pending', expiresAt: '2025-09-01T00:00:00.000Z' } } } })
  async validateInvite(@Request() req: any, @Query('token') token: string): Promise<ApiResponseDto<any>> {
    const result = await this.circleService.validateInviteToken(req.user.id, token);
    return { success: true, data: result };
  }

  @Get('members')
  @Roles(UserRole.REFERRER)
  @ApiOperation({ summary: 'Get my circle members', description: 'Returns accepted circle members for the current referrer.' })
  @ApiResponse({ status: 200, description: 'Circle members', schema: { example: { success: true, data: [{ relationId: 'uuid', user: { id: 'uuid', firstName: 'John', lastName: 'Doe', email: 'john@example.com' }, status: 'accepted' }] } } })
  async members(@Request() req: any): Promise<ApiResponseDto<any>> {
    const data = await this.circleService.getMembers(req.user.id);
    return { success: true, data };
  }

  @Delete('members/:relationId')
  @Roles(UserRole.REFERRER)
  @ApiOperation({ summary: 'Remove a circle member' })
  @ApiParam({ name: 'relationId', description: 'referrer_circle relation ID to remove' })
  @ApiResponse({ status: 200, description: 'Member removed (if existed)', schema: { example: { success: true, data: { removed: 1 } } } })
  async removeMember(@Request() req: any, @Param('relationId') relationId: string): Promise<ApiResponseDto<any>> {
    const data = await this.circleService.removeMember(req.user.id, relationId);
    return { success: true, data };
  }

  @Post('accept')
  @Roles(UserRole.REFERRER)
  @ApiOperation({ summary: 'Accept circle invite by token' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { token: { type: 'string', description: 'Invite token from invite URL' } },
      required: ['token']
    }
  })
  @ApiResponse({ status: 200, description: 'Invite accepted' })
  async accept(@Request() req: any, @Body() body: { token: string }): Promise<ApiResponseDto<any>> {
    const updated = await this.circleService.acceptInviteByToken(req.user.id, body.token);
    return { success: true, data: updated };
  }

  @Post('reject')
  @Roles(UserRole.REFERRER)
  @ApiOperation({ summary: 'Reject circle invite by token' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { token: { type: 'string', description: 'Invite token from invite URL' } },
      required: ['token']
    }
  })
  @ApiResponse({ status: 200, description: 'Invite rejected' })
  async reject(@Request() req: any, @Body() body: { token: string }): Promise<ApiResponseDto<any>> {
    const updated = await this.circleService.rejectInviteByToken(req.user.id, body.token);
    return { success: true, data: updated };
  }
}


