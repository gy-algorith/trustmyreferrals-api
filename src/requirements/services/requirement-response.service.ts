import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { RequirementResponse, RequirementResponseStatus } from '../../entities/requirement-response.entity';
import { Requirement } from '../../entities/requirement.entity';
import { CreateRequirementResponseDto } from '../dto/create-requirement-response.dto';
import { User } from '../../entities/user.entity';
import { Deck, SourceType } from '../../entities/deck.entity';

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

    return this.requirementResponseRepository.find({
      where: whereCondition,
      relations: ['candidate', 'referrer'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
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
