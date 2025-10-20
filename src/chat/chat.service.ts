import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, In, LessThan } from 'typeorm';
import { ChatChannel, ChatChannelType } from '../entities/chat-channel.entity';
import { ChatParticipant } from '../entities/chat-participant.entity';
import { ChatMessage, MessageContentType } from '../entities/chat-message.entity';
import { User } from '../entities/user.entity';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ChatChannel) private readonly channelRepo: Repository<ChatChannel>,
    @InjectRepository(ChatParticipant) private readonly participantRepo: Repository<ChatParticipant>,
    @InjectRepository(ChatMessage) private readonly messageRepo: Repository<ChatMessage>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  async listChannelsForUser(userId: string, limit?: number, beforeTs?: number) {
    // Find channelIds where user participates
    const participantWhere: FindOptionsWhere<ChatParticipant> = { userId, isActive: true };
    const memberships = await this.participantRepo.find({ where: participantWhere, select: { channelId: true } });
    const channelIds = memberships.map(m => m.channelId);
    if (channelIds.length === 0) return [];

    const where: FindOptionsWhere<ChatChannel> = { isActive: true } as any;
    (where as any).id = In(channelIds);
    if (typeof beforeTs === 'number' && !Number.isNaN(beforeTs)) {
      where.lastMessageAt = LessThan(new Date(beforeTs));
    }

    const take = typeof limit === 'number' && limit > 0 ? limit : undefined;
    const channels = await this.channelRepo.find({ where, order: { lastMessageAt: 'DESC' }, take });

    // 참가자 로드 및 사용자 정보(firstName, lastName) 조인
    const channelIdsPage = channels.map(c => c.id);
    const participants = channelIdsPage.length
      ? await this.participantRepo.find({ where: { channelId: In(channelIdsPage), isActive: true } })
      : [];
    const userIds = Array.from(new Set(participants.map(p => p.userId)));
    const users = userIds.length
      ? await this.userRepo.find({ where: { id: In(userIds) }, select: { id: true, firstName: true, lastName: true } as any })
      : [];
    const userMap = new Map(users.map(u => [u.id, { id: u.id, firstName: u.firstName, lastName: u.lastName }]));

    const participantsByChannel = new Map<string, any[]>();
    for (const p of participants) {
      const arr = participantsByChannel.get(p.channelId) || [];
      arr.push({ userId: p.userId, lastReadAt: p.lastReadAt, role: p.role, user: userMap.get(p.userId) });
      participantsByChannel.set(p.channelId, arr);
    }

    return channels.map(c => ({ ...c, participants: participantsByChannel.get(c.id) || [] }));
  }

  async getOrCreateDirectChannel(userA: string, userB: string): Promise<ChatChannel> {
    // Find existing direct channel with both participants
    const participants = await this.participantRepo.find({ where: { userId: In([userA, userB]), isActive: true } });
    const channelIdToCount = new Map<string, number>();
    for (const p of participants) {
      channelIdToCount.set(p.channelId, (channelIdToCount.get(p.channelId) || 0) + 1);
    }
    const directChannelIds = [...channelIdToCount.entries()].filter(([, c]) => c === 2).map(([id]) => id);
    if (directChannelIds.length > 0) {
      const existing = await this.channelRepo.findOne({ where: { id: In(directChannelIds), type: ChatChannelType.DIRECT, isActive: true } });
      if (existing) return existing;
    }

    // Create new
    const channel = await this.channelRepo.save(this.channelRepo.create({ type: ChatChannelType.DIRECT, isActive: true }));
    await this.participantRepo.save([
      this.participantRepo.create({ channelId: channel.id, userId: userA, isActive: true }),
      this.participantRepo.create({ channelId: channel.id, userId: userB, isActive: true }),
    ]);
    return channel;
  }

  async createGroupChannel(ownerId: string, name: string, memberIds: string[]): Promise<ChatChannel> {
    const channel = await this.channelRepo.save(this.channelRepo.create({ type: ChatChannelType.GROUP, name, isActive: true }));
    const members = Array.from(new Set([ownerId, ...memberIds]));
    await this.participantRepo.save(members.map(uid => this.participantRepo.create({ channelId: channel.id, userId: uid, isActive: true })));
    return channel;
  }

  async sendMessage(channelId: string, senderId: string, text: string, contentType: MessageContentType = MessageContentType.TEXT) {
    // Verify membership
    const member = await this.participantRepo.findOne({ where: { channelId, userId: senderId, isActive: true } });
    if (!member) throw new Error('Not a participant');

    const message = await this.messageRepo.save(this.messageRepo.create({ channelId, senderId, contentType, text }));
    await this.channelRepo.update(channelId, { lastMessageAt: new Date() });
    return message;
  }

  async listMessages(channelId: string, limit?: number, beforeTs?: number) {
    const where: FindOptionsWhere<ChatMessage> = { channelId } as any;
    if (typeof beforeTs === 'number' && !Number.isNaN(beforeTs)) {
      where.createdAt = LessThan(new Date(beforeTs)) as any;
    }
    const take = typeof limit === 'number' && limit > 0 ? limit : undefined;
    return this.messageRepo.find({ where, order: { createdAt: 'DESC' }, take });
  }

  async markRead(channelId: string, userId: string, at: Date) {
    await this.participantRepo.update({ channelId, userId }, { lastReadAt: at });
    return { channelId, userId, lastReadAt: at };
  }
}


