import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserUpdate, UpdateType } from '../entities/user-update.entity';
import { User } from '../entities/user.entity';
import { UserRole } from '../common/enums/user-role.enum';

@Injectable()
export class UserUpdatesService {
  private readonly logger = new Logger(UserUpdatesService.name);

  constructor(
    @InjectRepository(UserUpdate)
    private userUpdateRepository: Repository<UserUpdate>,
  ) {}

  /**
   * 새로운 업데이트 생성
   */
  async createUpdate(data: {
    userId: string;
    updateType: UpdateType;
    description?: string;
    metadata?: Record<string, any>;
  }): Promise<UserUpdate> {
    const update = this.userUpdateRepository.create(data);
    const savedUpdate = await this.userUpdateRepository.save(update);
    
    this.logger.log(`User update created: ${data.updateType} for user ${data.userId}`);
    return savedUpdate;
  }

  /**
   * candidate 가입 시 자동으로 활동 로그 생성
   */
  async logCandidateRegistration(candidateId: string, referrerId: string): Promise<UserUpdate> {
    const candidate = await this.userUpdateRepository.manager.getRepository(User).findOne({
      where: { id: candidateId },
      select: ['firstName', 'lastName']
    });

    if (!candidate) {
      throw new Error(`Candidate with ID ${candidateId} not found`);
    }

    const referrer = await this.userUpdateRepository.manager.getRepository(User).findOne({
      where: { id: referrerId },
      select: ['firstName', 'lastName']
    });

    if (!referrer) {
      throw new Error(`Referrer with ID ${referrerId} not found`);
    }

    return this.createUpdate({
      userId: candidateId,
      updateType: UpdateType.EVENT,
      description: `${candidate.firstName} ${candidate.lastName} joined your deck through your invitation.`,
      metadata: {
        event: 'candidate_registration',
        candidateName: `${candidate.firstName} ${candidate.lastName}`,
        referrerId: referrerId,
        joinedAt: new Date().toISOString(),
      },
    });
  }

  /**
   * 사용자가 직접 작성한 포스트 생성
   */
  async createPost(userId: string, description: string): Promise<UserUpdate> {
    return this.createUpdate({
      userId,
      updateType: UpdateType.POST,
      description,
      metadata: {
        event: 'user_post',
        postedAt: new Date().toISOString(),
      },
    });
  }

  /**
   * 추천인이 볼 수 있는 candidate 업데이트 조회 (deck 관계 기반)
   */
  async getUpdatesForReferrer(referrerId: string, page: number = 1, limit: number = 20): Promise<{
    updates: Array<UserUpdate & { user: { id: string; firstName: string; lastName: string; email: string } }>;
    total: number;
  }> {
    console.log('🔍 getUpdatesForReferrer called with referrerId:', referrerId);
    
    // 1. deck 테이블에서 해당 referrer가 초대한 candidate들의 ID 목록 조회
    const deckCandidates = await this.userUpdateRepository.manager
      .createQueryBuilder()
      .select('deck.candidateId')
      .from('deck', 'deck')
      .where('deck.referrerId = :referrerId', { referrerId })
      .getRawMany();

    console.log('📊 Found deck candidates:', deckCandidates);

    if (deckCandidates.length === 0) {
      console.log('❌ No deck candidates found');
      return { updates: [], total: 0 };
    }

    const candidateIds = deckCandidates.map(d => d.deck_candidateId);
    console.log('👥 Candidate IDs:', candidateIds);

    // 2. 해당 candidate들의 업데이트 조회 (EVENT + POST)
    console.log('🔍 Querying updates for candidate IDs:', candidateIds);
    
    const [updates, total] = await this.userUpdateRepository
      .createQueryBuilder('update')
      .leftJoinAndSelect('update.user', 'user')
      .select([
        'update.id',
        'update.updateType',
        'update.description',
        'update.metadata',
        'update.createdAt',
        'user.id',
        'user.firstName',
        'user.lastName',
        'user.email'
      ])
      .where('update.userId IN (:...candidateIds)', { candidateIds })
      .andWhere('update.updateType IN (:...updateTypes)', { 
        updateTypes: [UpdateType.EVENT, UpdateType.POST] 
      })
      .orderBy('update.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    console.log('📝 Found updates:', updates.length, 'Total:', total);
    console.log('📋 Updates data:', updates);

    return { updates, total };
  }

  /**
   * 특정 candidate의 업데이트 조회 (본인만 조회 가능)
   */
  async getUpdatesByUser(userId: string, page: number = 1, limit: number = 20): Promise<{
    updates: UserUpdate[];
    total: number;
  }> {
    const [updates, total] = await this.userUpdateRepository
      .createQueryBuilder('update')
      .where('update.userId = :userId', { userId })
      .andWhere('update.updateType = :updateType', { updateType: UpdateType.POST })
      .orderBy('update.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { updates, total };
  }

  /**
   * 업데이트 수정 (작성자만 가능)
   */
  async updateUpdate(
    updateId: string,
    userId: string,
    data: Partial<Pick<UserUpdate, 'description'>>
  ): Promise<UserUpdate | null> {
    const update = await this.userUpdateRepository.findOne({
      where: { id: updateId, userId },
    });

    if (!update) {
      return null;
    }

    Object.assign(update, data);
    const savedUpdate = await this.userUpdateRepository.save(update);
    
    this.logger.log(`User update updated: ${updateId} by user ${userId}`);
    return savedUpdate;
  }
}
