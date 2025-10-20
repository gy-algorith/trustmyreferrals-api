import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { RequirementResponse, RequirementResponseStatus } from '../../entities/requirement-response.entity';
import { Requirement } from '../../entities/requirement.entity';
import { CreateRequirementResponseDto } from '../dto/create-requirement-response.dto';
import { User } from '../../entities/user.entity';
import { Deck, SourceType } from '../../entities/deck.entity';
import { CandidateInterest, InterestStatus } from '../../entities/candidate-interest.entity';
import { ReferrerCircle, CircleInviteStatus } from '../../entities/referrer-circle.entity';

@Injectable()
export class RequirementResponseService {
  constructor(
    @InjectRepository(RequirementResponse)
    private requirementResponseRepository: Repository<RequirementResponse>,
    @InjectRepository(Requirement)
    private requirementRepository: Repository<Requirement>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Deck)
    private deckRepository: Repository<Deck>,
    @InjectRepository(CandidateInterest)
    private candidateInterestRepository: Repository<CandidateInterest>,
    @InjectRepository(ReferrerCircle)
    private referrerCircleRepository: Repository<ReferrerCircle>,
    private dataSource: DataSource,
  ) {}

  async create(
    requirementId: string, 
    createDto: CreateRequirementResponseDto, 
    referrerId: string
  ): Promise<RequirementResponse> {
    // Requirement 존재 확인
    const requirement = await this.requirementRepository.findOne({
      where: { id: requirementId }
    });

    if (!requirement) {
      throw new NotFoundException('Requirement not found');
    }

    // 자신이 작성한 requirement에는 응답할 수 없음
    if (requirement.referrerId === referrerId) {
      throw new BadRequestException('Cannot respond to your own requirement');
    }

    // Candidate 존재 여부 확인
    const candidate = await this.userRepository.findOne({
      where: { id: createDto.candidateId }
    });

    if (!candidate) {
      throw new NotFoundException(`Candidate with ID ${createDto.candidateId} not found`);
    }

    // Candidate가 실제로 존재하는지 확인
    if (!candidate.isActive()) {
      throw new BadRequestException('Candidate is not active');
    }

    // 이미 응답한 후보자인지 확인
    const existingResponse = await this.requirementResponseRepository.findOne({
      where: {
        requirementId,
        candidateId: createDto.candidateId,
        referrerId,
      }
    });

    if (existingResponse) {
      throw new BadRequestException('Already responded with this candidate');
    }

    const response = this.requirementResponseRepository.create({
      ...createDto,
      requirementId,
      referrerId,
      status: RequirementResponseStatus.PENDING,
    });

    return this.requirementResponseRepository.save(response);
  }

  async findResponses(
    requirementId: string, 
    userId: string, 
    page: number, 
    limit: number,
    status: RequirementResponseStatus = RequirementResponseStatus.PENDING
  ): Promise<RequirementResponse[]> {
    // Requirement 작성자만 응답을 볼 수 있음
    const requirement = await this.requirementRepository.findOne({
      where: { id: requirementId, referrerId: userId }
    });

    if (!requirement) {
      throw new NotFoundException('Requirement not found or access denied');
    }

    // status 필터링을 위한 where 조건 구성
    const whereCondition: any = { requirementId };
    
    // status가 제공된 경우 필터 추가
    if (status) {
      whereCondition.status = status;
    }

    // Fetch all responses for scoring (app-level sort). For large data sets, consider cursor/limit strategies.
    const allResponses = await this.requirementResponseRepository.find({
      where: whereCondition,
      relations: ['candidate', 'referrer'],
      order: { createdAt: 'DESC' }, // temporary order before scoring
    });

    if (allResponses.length === 0) return [];

    const viewerId = userId;
    const referrerIds = Array.from(new Set(allResponses.map(r => r.referrerId)));
    const candidateIds = Array.from(new Set(allResponses.map(r => r.candidateId)));

    // 1) Success rate per referrer (approved / (approved + rejected))
    const actedStatuses = [RequirementResponseStatus.APPROVED, RequirementResponseStatus.REJECTED];
    const successRows = await this.requirementResponseRepository.createQueryBuilder('rr')
      .select('rr.referrerId', 'referrerId')
      .addSelect(`SUM(CASE WHEN rr.status = :approved THEN 1 ELSE 0 END)`, 'approvedCount')
      .addSelect(`SUM(CASE WHEN rr.status IN (:...acted) THEN 1 ELSE 0 END)`, 'actedCount')
      .where('rr.referrerId IN (:...referrerIds)', { referrerIds })
      .setParameters({ approved: RequirementResponseStatus.APPROVED, acted: actedStatuses })
      .groupBy('rr.referrerId')
      .getRawMany<{ referrerId: string; approvedCount: string; actedCount: string }>();

    const referrerSuccessRate = new Map<string, number>();
    for (const row of successRows) {
      const approved = Number(row.approvedCount || 0);
      const acted = Number(row.actedCount || 0);
      const rate = acted > 0 ? approved / acted : 0;
      referrerSuccessRate.set(row.referrerId, rate);
    }

    // 2) Review average - not implemented (no table) -> 0
    // 3) Invited count - not implemented (no origin field) -> 0

    // 4) Candidate last login within 7 days
    const now = new Date();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

    // 5) Interest check accepted within 14 days for referrer-candidate pair
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    let interestPairs = new Set<string>();
    if (referrerIds.length > 0 && candidateIds.length > 0) {
      const interests = await this.candidateInterestRepository.createQueryBuilder('ci')
        .select(['ci.referrerId AS referrerId', 'ci.candidateId AS candidateId'])
        .where('ci.status = :accepted', { accepted: InterestStatus.ACCEPTED })
        .andWhere('ci.createdAt >= :since', { since: fourteenDaysAgo })
        .andWhere('ci.referrerId IN (:...referrerIds)', { referrerIds })
        .andWhere('ci.candidateId IN (:...candidateIds)', { candidateIds })
        .getRawMany<{ referrerId: string; candidateId: string }>();
      interestPairs = new Set(interests.map(i => `${i.referrerId}::${i.candidateId}`));
    }

    // 6) Circle bonus (direct 10, indirect 5)
    // direct: accepted relation between viewer and referrer in any direction
    const directSet = new Set<string>();
    if (referrerIds.length > 0) {
      const directLinks = await this.referrerCircleRepository.createQueryBuilder('rc')
        .select(['rc.inviterId AS inviterId', 'rc.accepterId AS accepterId'])
        .where('rc.status = :accepted', { accepted: CircleInviteStatus.ACCEPTED })
        .andWhere(
          '(rc.inviterId = :viewerId AND rc.accepterId IN (:...referrerIds)) OR (rc.accepterId = :viewerId AND rc.inviterId IN (:...referrerIds))',
          { viewerId, referrerIds },
        )
        .getRawMany<{ inviterId: string; accepterId: string }>();
      for (const l of directLinks) {
        const other = l.inviterId === viewerId ? l.accepterId : l.inviterId;
        directSet.add(other);
      }
    }

    // neighbors of viewer
    const neighborIds = new Set<string>();
    const neighborLinks = await this.referrerCircleRepository.createQueryBuilder('rc')
      .select(['rc.inviterId AS inviterId', 'rc.accepterId AS accepterId'])
      .where('rc.status = :accepted', { accepted: CircleInviteStatus.ACCEPTED })
      .andWhere('(rc.inviterId = :viewerId OR rc.accepterId = :viewerId)', { viewerId })
      .getRawMany<{ inviterId: string; accepterId: string }>();
    for (const l of neighborLinks) {
      neighborIds.add(l.inviterId === viewerId ? l.accepterId : l.inviterId);
    }

    // indirect: neighbor -> referrer accepted relation (any direction)
    const indirectSet = new Set<string>();
    const neighborIdArr = Array.from(neighborIds).filter(id => id && id !== viewerId);
    if (neighborIdArr.length > 0 && referrerIds.length > 0) {
      const indirectLinks = await this.referrerCircleRepository.createQueryBuilder('rc')
        .select(['rc.inviterId AS inviterId', 'rc.accepterId AS accepterId'])
        .where('rc.status = :accepted', { accepted: CircleInviteStatus.ACCEPTED })
        .andWhere(
          '(rc.inviterId IN (:...neighbors) AND rc.accepterId IN (:...referrers)) OR (rc.accepterId IN (:...neighbors) AND rc.inviterId IN (:...referrers))',
          { neighbors: neighborIdArr, referrers: referrerIds },
        )
        .getRawMany<{ inviterId: string; accepterId: string }>();
      for (const l of indirectLinks) {
        const target = referrerIds.includes(l.inviterId) ? l.inviterId : l.accepterId;
        indirectSet.add(target);
      }
    }

    // Compute scores per response
    const scored = allResponses.map((r) => {
      const referrerId = r.referrerId;
      const candidate = r.candidate as User;
      const successRate = referrerSuccessRate.get(referrerId) || 0; // 0..1
      const successScore = successRate * 30;

      const reviewScore = 0; // placeholder
      const invitedScore = 0; // placeholder

      const candidateActiveScore = (candidate?.lastLoginAt && (now.getTime() - new Date(candidate.lastLoginAt).getTime()) <= sevenDaysMs) ? 5 : 0;

      const interestScore = interestPairs.has(`${referrerId}::${r.candidateId}`) ? 10 : 0;

      const circleBonus = directSet.has(referrerId) ? 10 : (indirectSet.has(referrerId) ? 5 : 0);

      const premiumBonus = candidate?.subscriptionPurchased ? 5 : 0;

      const rawTotal = successScore + reviewScore + invitedScore + candidateActiveScore + interestScore + circleBonus + premiumBonus;
      const total = Math.min(rawTotal, 100);

      // Attach ephemeral score for sorting/debugging
      const scoreNumber = Number(total.toFixed(2));
      (r as any).score = scoreNumber;

      // Minimize sensitive user info exposure
      if (r.candidate && typeof r.candidate === 'object') {
        const c = r.candidate as any;
        (r as any).candidate = {
          id: c.id,
          firstName: c.firstName,
          lastName: c.lastName,
        };
      }
      if (r.referrer && typeof r.referrer === 'object') {
        const f = r.referrer as any;
        (r as any).referrer = {
          id: f.id,
          firstName: f.firstName,
          lastName: f.lastName,
        };
      }

      // Attach detailed breakdown for testers
      (r as any).scoreDetails = {
        components: {
          successRate: { rate: Number(successRate.toFixed(4)), score: Number(successScore.toFixed(2)) },
          reviewScore: { score: Number(reviewScore.toFixed(2)) },
          invitedScore: { score: Number(invitedScore.toFixed(2)) },
          candidateActive: {
            recentLoginWithin7Days: !!candidate?.lastLoginAt && (now.getTime() - new Date(candidate.lastLoginAt).getTime()) <= sevenDaysMs,
            lastLoginAt: candidate?.lastLoginAt || null,
            score: Number(candidateActiveScore.toFixed(2)),
          },
          interest: {
            hasRecentAcceptedInterest: interestPairs.has(`${referrerId}::${r.candidateId}`),
            sinceDays: 14,
            score: Number(interestScore.toFixed(2)),
          },
          circle: {
            relation: directSet.has(referrerId) ? 'direct' : (indirectSet.has(referrerId) ? 'indirect' : 'none'),
            score: Number(circleBonus.toFixed(2)),
          },
          premium: {
            isPremium: !!candidate?.subscriptionPurchased,
            score: Number(premiumBonus.toFixed(2)),
          },
        },
        total: Number(rawTotal.toFixed(2)),
        cappedTotal: scoreNumber,
      };
      return r as any;
    });

    // Sort by score desc, then createdAt desc as tiebreaker
    scored.sort((a: any, b: any) => {
      if (b.score !== a.score) return b.score - a.score;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    // Pagination after scoring
    const start = (page - 1) * limit;
    const end = start + limit;
    return scored.slice(start, end);
  }

  async approve(
    requirementId: string, 
    responseId: string, 
    userId: string
  ): Promise<any> {
    // 트랜잭션으로 모든 작업을 묶어서 처리
    return await this.dataSource.transaction(async (manager) => {
      // Requirement 작성자만 승인할 수 있음
      const requirement = await manager.findOne(Requirement, {
        where: { id: requirementId, referrerId: userId }
      });

      if (!requirement) {
        throw new NotFoundException('Requirement not found or access denied');
      }

      const response = await manager.findOne(RequirementResponse, {
        where: { id: responseId, requirementId }
      });

      if (!response) {
        throw new NotFoundException('Response not found');
      }

      // 이미 승인된 응답인지 확인
      if (response.status === RequirementResponseStatus.APPROVED) {
        throw new BadRequestException('Response is already approved');
      }

      // 사용자 잔액 확인 및 차감
      const user = await manager.findOne(User, {
        where: { id: userId }
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // 잔액이 부족한지 확인
      if (user.balance < response.purchasePrice) {
        throw new BadRequestException(`Insufficient balance. Required: ${response.purchasePrice} cents, Available: ${user.balance} cents`);
      }

      // 잔액 차감
      user.balance -= response.purchasePrice;
      await manager.save(User, user);

      // 응답 상태를 승인으로 변경
      response.status = RequirementResponseStatus.APPROVED;
      await manager.save(RequirementResponse, response);

      // 사용자의 purchased candidates 수 증가
      user.purchasedCandidates = (user.purchasedCandidates || 0) + 1;
      await manager.save(User, user);

      // Deck에 PUSH 타입으로 추가 (아직 없는 경우)
      const existingDeck = await manager.findOne(Deck, {
        where: { referrerId: userId, candidateId: response.candidateId }
      });

      if (!existingDeck) {
        const newDeck = manager.create(Deck, {
          referrerId: userId,
          candidateId: response.candidateId,
          source: SourceType.PUSH,
        });
        await manager.save(Deck, newDeck);

        // RequirementResponse에 deckId 연결
        response.deckId = newDeck.id;
        await manager.save(RequirementResponse, response);
      }

      return {
        message: 'Response approved successfully',
        balanceDeducted: response.purchasePrice,
        newBalance: user.balance,
        deckCreated: !existingDeck,
      };
    });
  }

  async reject(
    requirementId: string, 
    responseId: string, 
    userId: string
  ): Promise<any> {
    // Requirement 작성자만 거절할 수 있음
    const requirement = await this.requirementRepository.findOne({
      where: { id: requirementId, referrerId: userId }
    });

    if (!requirement) {
      throw new NotFoundException('Requirement not found or access denied');
    }

    const response = await this.requirementResponseRepository.findOne({
      where: { id: responseId, requirementId }
    });

    if (!response) {
      throw new NotFoundException('Response not found');
    }

    // 상태를 거절로 변경
    response.status = RequirementResponseStatus.REJECTED;
    await this.requirementResponseRepository.save(response);

    return {
      message: 'Response rejected successfully',
    };
  }

  async getResponseCount(requirementId: string): Promise<number> {
    return this.requirementResponseRepository.count({
      where: { requirementId }
    });
  }
}
