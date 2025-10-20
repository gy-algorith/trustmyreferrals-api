import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { ReferrerCircle, CircleInviteStatus } from '../entities/referrer-circle.entity';
import { User } from '../entities/user.entity';
import { UserRole, UserStatus } from '../common/enums/user-role.enum';
import cryptoRandomString from 'crypto-random-string';

@Injectable()
export class CircleService {
  constructor(
    @InjectRepository(ReferrerCircle) private readonly circleRepo: Repository<ReferrerCircle>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  async searchReferrers(q: string, limit = 20) {
    if (!q || q.trim() === '') return [];
    return this.userRepo.find({
      where: [
        { role: UserRole.REFERRER, email: ILike(`%${q}%`) },
        { role: UserRole.REFERRER, firstName: ILike(`%${q}%`) },
        { role: UserRole.REFERRER, lastName: ILike(`%${q}%`) },
      ],
      take: limit,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
      } as any,
    });
  }

  async createOrReuseInvite(inviterId: string, accepterId: string) {
    const now = new Date();
    // Validate inviter and accepter
    const inviter = await this.userRepo.findOne({ where: { id: inviterId } });
    if (!inviter || inviter.role !== UserRole.REFERRER) {
      throw new BadRequestException('Inviter must be a referrer');
    }
    const accepter = await this.userRepo.findOne({ where: { id: accepterId } });
    if (!accepter || accepter.role !== UserRole.REFERRER) {
      throw new BadRequestException('Accepter must be a referrer');
    }
    if (inviterId === accepterId) {
      throw new BadRequestException('Cannot invite yourself');
    }
    if (![UserStatus.ACTIVE, UserStatus.PENDING].includes(accepter.status as any)) {
      throw new BadRequestException('Accepter must be active or pending');
    }
    // 기존 초대 중 PENDING 상태만 재사용
    let invite = await this.circleRepo.findOne({ where: { inviterId, accepterId, status: CircleInviteStatus.PENDING } });
    if (invite) {
      if (invite.status === CircleInviteStatus.PENDING) {
        const needRefresh = !invite.inviteToken || !invite.tokenExpiresAt || invite.tokenExpiresAt <= now;
        if (needRefresh) {
          invite.inviteToken = cryptoRandomString({ length: 32, type: 'alphanumeric' });
          invite.tokenExpiresAt = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 365 * 100);
          invite = await this.circleRepo.save(invite);
        }
      }
      return invite;
    }
    // DECLINED(=REJECTED) 상태가 있으면 PENDING으로 되돌려 새 토큰으로 반환
    const declined = await this.circleRepo.findOne({ where: { inviterId, accepterId, status: CircleInviteStatus.REJECTED } });
    if (declined) {
      declined.status = CircleInviteStatus.PENDING;
      declined.inviteToken = cryptoRandomString({ length: 32, type: 'alphanumeric' });
      declined.tokenExpiresAt = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 365 * 100);
      return this.circleRepo.save(declined);
    }
    // 이미 ACCEPTED 관계가 있으면 새 초대 생성 불가
    const accepted = await this.circleRepo.findOne({ where: { inviterId, accepterId, status: CircleInviteStatus.ACCEPTED } });
    if (accepted) {
      throw new BadRequestException('Already circle members');
    }
    // create new pending invite
    invite = this.circleRepo.create({
      inviterId,
      accepterId,
      inviteToken: cryptoRandomString({ length: 32, type: 'alphanumeric' }),
      tokenExpiresAt: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 7),
      status: CircleInviteStatus.PENDING,
    });
    return this.circleRepo.save(invite);
  }

  async getPendingInvites(userId: string) {
    return this.circleRepo.find({ where: { accepterId: userId, status: CircleInviteStatus.PENDING } });
  }

  async acceptInviteByToken(accepterId: string, token: string) {
    if (!token || token.trim() === '') throw new BadRequestException('Invalid invite token');
    const invite = await this.circleRepo.findOne({ where: { inviteToken: token } });
    if (!invite) throw new NotFoundException('Invite not found');
    if (invite.accepterId !== accepterId) throw new BadRequestException('Not authorized to accept this invite');
    if (invite.status !== CircleInviteStatus.PENDING) throw new BadRequestException('Invite is not pending');
    if (invite.tokenExpiresAt && new Date() > invite.tokenExpiresAt) throw new BadRequestException('Invite token expired');

    invite.status = CircleInviteStatus.ACCEPTED;
    invite.inviteToken = null as any;
    invite.tokenExpiresAt = null as any;
    return this.circleRepo.save(invite);
  }

  async rejectInviteByToken(accepterId: string, token: string) {
    if (!token || token.trim() === '') throw new BadRequestException('Invalid invite token');
    const invite = await this.circleRepo.findOne({ where: { inviteToken: token } });
    if (!invite) throw new NotFoundException('Invite not found');
    if (invite.accepterId !== accepterId) throw new BadRequestException('Not authorized to reject this invite');
    if (invite.status !== CircleInviteStatus.PENDING) throw new BadRequestException('Invite is not pending');
    if (invite.tokenExpiresAt && new Date() > invite.tokenExpiresAt) throw new BadRequestException('Invite token expired');

    invite.status = CircleInviteStatus.REJECTED;
    invite.inviteToken = null as any;
    invite.tokenExpiresAt = null as any;
    return this.circleRepo.save(invite);
  }

  async validateInviteToken(accepterId: string, token: string) {
    const result: any = { isValid: false };
    if (!token || token.trim() === '') {
      return { ...result, reason: 'invalid_token' };
    }

    const invite = await this.circleRepo.findOne({ where: { inviteToken: token } });
    if (!invite) {
      return { ...result, reason: 'not_found' };
    }

    if (invite.accepterId !== accepterId) {
      return { ...result, reason: 'forbidden' };
    }

    if (invite.status !== CircleInviteStatus.PENDING) {
      return { ...result, reason: 'used', status: invite.status };
    }

    if (invite.tokenExpiresAt && new Date() > invite.tokenExpiresAt) {
      return { ...result, reason: 'expired' };
    }

    // Valid
    const inviter = await this.userRepo.findOne({ where: { id: invite.inviterId }, select: { id: true, firstName: true, lastName: true, email: true } as any });
    return {
      isValid: true,
      inviteId: invite.id,
      inviter,
      status: invite.status,
      expiresAt: invite.tokenExpiresAt,
    };
  }

  async getMembers(userId: string) {
    const relations = await this.circleRepo.find({
      where: [
        { inviterId: userId, status: CircleInviteStatus.ACCEPTED },
        { accepterId: userId, status: CircleInviteStatus.ACCEPTED },
      ],
    });
    if (relations.length === 0) return [];
    const otherUserIds = Array.from(
      new Set(
        relations.map(r => (r.inviterId === userId ? r.accepterId : r.inviterId))
      )
    );
    const users = await this.userRepo.find({
      where: otherUserIds.map(id => ({ id })),
      select: { id: true, firstName: true, lastName: true, email: true } as any,
    });
    const map = new Map(users.map(u => [u.id, u]));
    return relations.map(r => ({
      relationId: r.id,
      user: map.get(r.inviterId === userId ? r.accepterId : r.inviterId),
      status: r.status,
      createdAt: r.createdAt,
    })).filter(x => !!x.user);
  }

  async removeMember(userId: string, relationId: string) {
    const relation = await this.circleRepo.findOne({ where: { id: relationId } });
    if (!relation) return { removed: 0 };
    if (relation.status !== CircleInviteStatus.ACCEPTED) return { removed: 0 };
    if (relation.inviterId !== userId && relation.accepterId !== userId) {
      throw new BadRequestException('Not authorized to remove this relation');
    }
    const res = await this.circleRepo.delete({ id: relationId } as any);
    return { removed: res.affected || 0 };
  }
}


