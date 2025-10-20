import { Body, Controller, Get, Param, Post, Query, UseGuards, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags, ApiQuery, ApiBody, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ChatService } from './chat.service';
import { ApiResponseDto } from '../common/dto/api-response.dto';

@ApiTags('chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('channels')
  @ApiOperation({ summary: 'List my channels (pull)', description: 'Returns channels the user participates in, sorted by lastMessageAt desc. Supports before cursor and limit.' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Max channels to return (default: all)' })
  @ApiQuery({ name: 'beforeTs', required: false, type: Number, description: 'Only channels with lastMessageAt before this timestamp (ms)' })
  @ApiResponse({ status: 200, description: 'Channel list', type: ApiResponseDto })
  async listChannels(
    @Request() req: any,
    @Query('limit') limit?: string | number,
    @Query('beforeTs') beforeTs?: string | number,
  ): Promise<ApiResponseDto<any>> {
    const parsedLimit = typeof limit === 'string' ? parseInt(limit, 10) : (typeof limit === 'number' ? limit : undefined);
    const parsedBeforeTs = typeof beforeTs === 'string' ? (beforeTs.trim() !== '' ? Number(beforeTs) : undefined) : (typeof beforeTs === 'number' ? beforeTs : undefined);
    const channels = await this.chatService.listChannelsForUser(req.user.id, parsedLimit, parsedBeforeTs);
    return { success: true, data: channels };
  }

  @Post('channels/direct/:userId')
  @ApiOperation({ summary: 'Get or create direct channel', description: 'Creates a direct channel between me and userId if not exists.' })
  @ApiParam({ name: 'userId', description: 'Target user ID for direct channel' })
  async getOrCreateDirect(@Request() req: any, @Param('userId') otherUserId: string): Promise<ApiResponseDto<any>> {
    const channel = await this.chatService.getOrCreateDirectChannel(req.user.id, otherUserId);
    return { success: true, data: channel };
  }

  @Post('channels/group')
  @ApiOperation({ summary: 'Create group channel' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Project Alpha' },
        members: { type: 'array', items: { type: 'string' }, example: ['uuid-user-1', 'uuid-user-2'] }
      },
      required: ['name']
    }
  })
  async createGroup(
    @Request() req: any,
    @Body() body: { name: string; members: string[] },
  ): Promise<ApiResponseDto<any>> {
    const channel = await this.chatService.createGroupChannel(req.user.id, body.name, body.members || []);
    return { success: true, data: channel };
  }

  @Get('channels/:channelId/messages')
  @ApiOperation({ summary: 'List messages (pull)', description: 'Returns messages in reverse chronological order with cursor support.' })
  @ApiParam({ name: 'channelId', description: 'Channel ID' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Max messages to return (default: all)' })
  @ApiQuery({ name: 'beforeTs', required: false, type: Number, description: 'Only messages created before this timestamp (ms)' })
  async listMessages(
    @Request() req: any,
    @Param('channelId') channelId: string,
    @Query('limit') limit?: string | number,
    @Query('beforeTs') beforeTs?: string | number,
  ): Promise<ApiResponseDto<any>> {
    // membership check is handled in service when sending; for listing, we trust guard + service can be extended later
    const parsedLimit = typeof limit === 'string' ? parseInt(limit, 10) : (typeof limit === 'number' ? limit : undefined);
    const parsedBeforeTs = typeof beforeTs === 'string' ? (beforeTs.trim() !== '' ? Number(beforeTs) : undefined) : (typeof beforeTs === 'number' ? beforeTs : undefined);
    const messages = await this.chatService.listMessages(channelId, parsedLimit, parsedBeforeTs);
    return { success: true, data: messages };
  }

  @Post('channels/:channelId/messages')
  @ApiOperation({ summary: 'Send message' })
  @ApiParam({ name: 'channelId', description: 'Channel ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        text: { type: 'string', example: 'Hello, world!' }
      },
      required: ['text']
    }
  })
  async sendMessage(
    @Request() req: any,
    @Param('channelId') channelId: string,
    @Body() body: { text: string },
  ): Promise<ApiResponseDto<any>> {
    const msg = await this.chatService.sendMessage(channelId, req.user.id, body.text);
    return { success: true, data: msg };
  }

  @Post('channels/:channelId/read')
  @ApiOperation({ summary: 'Mark channel as read up to now' })
  @ApiParam({ name: 'channelId', description: 'Channel ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        at: { type: 'string', format: 'date-time', example: '2025-08-27T12:34:56.000Z', description: 'ISO timestamp; defaults to now' }
      }
    }
  })
  async markRead(
    @Request() req: any,
    @Param('channelId') channelId: string,
    @Body() body: { at?: string },
  ): Promise<ApiResponseDto<any>> {
    const at = body?.at ? new Date(body.at) : new Date();
    const res = await this.chatService.markRead(channelId, req.user.id, at);
    return { success: true, data: res };
  }
}


