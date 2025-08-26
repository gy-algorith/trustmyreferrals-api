import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CandidateInterest, InterestStatus } from '../entities/candidate-interest.entity';
import { User } from '../entities/user.entity';
import { CreateCandidateInterestDto } from './dto/create-candidate-interest.dto';
import { CandidateInterestDto } from './dto/candidate-interest.dto';

import { UserRole } from '../common/enums/user-role.enum';

@Injectable()
export class CandidateInterestService {
  private readonly logger = new Logger(CandidateInterestService.name);

  constructor(
    @InjectRepository(CandidateInterest)
    private candidateInterestRepository: Repository<CandidateInterest>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  /**
   * Referrer가 candidate에게 position offer 생성
   */
  async create(
    createDto: CreateCandidateInterestDto,
    referrerId: string,
  ): Promise<CandidateInterestDto> {
    // Candidate가 존재하는지 확인
    const candidate = await this.userRepository.findOne({
      where: { id: createDto.candidateId },
    });

    if (!candidate) {
      throw new NotFoundException('Candidate not found');
    }

    // Referrer가 candidate에게 offer를 보낼 수 있는지 확인 (Deck 관계 또는 다른 권한)
    // TODO: Deck 관계 확인 로직 추가

    // 이미 pending 상태의 offer가 있는지 확인
    const existingOffer = await this.candidateInterestRepository.findOne({
      where: {
        referrerId,
        candidateId: createDto.candidateId,
        status: InterestStatus.PENDING,
      },
    });

    if (existingOffer) {
      throw new BadRequestException('You already have a pending offer for this candidate');
    }

    // Candidate Interest 생성
    const candidateInterest = this.candidateInterestRepository.create({
      ...createDto,
      referrerId,
      status: InterestStatus.PENDING,
    });

    const savedInterest = await this.candidateInterestRepository.save(candidateInterest);

    this.logger.log(`Candidate interest created: ${savedInterest.id} by referrer ${referrerId} for candidate ${createDto.candidateId}`);

    return this.transformToDto(savedInterest);
  }

  /**
   * 모든 candidate interest 조회 (역할에 따라 필터링)
   */
  async findAll(userId: string, userRole: string): Promise<CandidateInterestDto[]> {
    let query = this.candidateInterestRepository
      .createQueryBuilder('ci')
      .leftJoinAndSelect('ci.candidate', 'candidate')
      .leftJoinAndSelect('ci.referrer', 'referrer')
      .orderBy('ci.createdAt', 'DESC');

    // Referrer인 경우: 자신이 보낸 offer들만 조회
    if (userRole === UserRole.REFERRER) {
      query = query.where('ci.referrerId = :userId', { userId });
    }
    // Candidate인 경우: 자신에게 온 offer들만 조회
    else if (userRole === UserRole.CANDIDATE) {
      query = query.where('ci.candidateId = :userId', { userId });
    }
    // 기타 역할: 접근 거부
    else {
      throw new ForbiddenException('Access denied');
    }

    const interests = await query.getMany();
    return interests.map(interest => this.transformToDto(interest));
  }

  /**
   * 특정 candidate interest 조회
   */
  async findOne(id: string, userId: string, userRole: string): Promise<CandidateInterestDto> {
    const interest = await this.candidateInterestRepository.findOne({
      where: { id },
      relations: ['candidate', 'referrer'],
    });

    if (!interest) {
      throw new NotFoundException('Candidate interest not found');
    }

    // 권한 확인
    if (!this.canAccessInterest(interest, userId, userRole)) {
      throw new ForbiddenException('Access denied to this candidate interest');
    }

    return this.transformToDto(interest);
  }

  /**
   * Candidate interest 승인
   */
  async approve(id: string, userId: string): Promise<CandidateInterestDto> {
    const interest = await this.candidateInterestRepository.findOne({
      where: { id },
    });

    if (!interest) {
      throw new NotFoundException('Candidate interest not found');
    }

    // Candidate만 승인할 수 있음
    if (interest.candidateId !== userId) {
      throw new ForbiddenException('Only the candidate can approve this interest');
    }

    if (interest.status !== InterestStatus.PENDING) {
      throw new BadRequestException('Only pending interests can be approved');
    }

    interest.status = InterestStatus.ACCEPTED;
    interest.respondedAt = new Date();

    const updatedInterest = await this.candidateInterestRepository.save(interest);

    this.logger.log(`Candidate interest approved: ${id} by candidate ${userId}`);

    return this.transformToDto(updatedInterest);
  }

  /**
   * Candidate interest 거부
   */
  async reject(id: string, userId: string): Promise<CandidateInterestDto> {
    const interest = await this.candidateInterestRepository.findOne({
      where: { id },
    });

    if (!interest) {
      throw new NotFoundException('Candidate interest not found');
    }

    // Candidate만 거부할 수 있음
    if (interest.candidateId !== userId) {
      throw new ForbiddenException('Only the candidate can reject this interest');
    }

    if (interest.status !== InterestStatus.PENDING) {
      throw new BadRequestException('Only pending interests can be rejected');
    }

    interest.status = InterestStatus.REJECTED;
    interest.respondedAt = new Date();

    const updatedInterest = await this.candidateInterestRepository.save(interest);

    this.logger.log(`Candidate interest rejected: ${id} by candidate ${userId}`);

    return this.transformToDto(updatedInterest);
  }

  /**
   * 사용자가 특정 interest에 접근할 수 있는지 확인
   */
  private canAccessInterest(
    interest: CandidateInterest,
    userId: string,
    userRole: string,
  ): boolean {
    // Referrer는 자신이 보낸 offer에만 접근 가능
    if (userRole === UserRole.REFERRER && interest.referrerId === userId) {
      return true;
    }

    // Candidate는 자신에게 온 offer에만 접근 가능
    if (userRole === UserRole.CANDIDATE && interest.candidateId === userId) {
      return true;
    }

    return false;
  }

  /**
   * Entity를 DTO로 변환
   */
  private transformToDto(interest: CandidateInterest): CandidateInterestDto {
    // 수동으로 모든 필드 매핑하여 정보 누락 방지
    const dto = new CandidateInterestDto();
    
    // 기본 필드들
    dto.id = interest.id;
    dto.candidateId = interest.candidateId;
    dto.referrerId = interest.referrerId;
    dto.positionTitle = interest.positionTitle;
    dto.company = interest.company;
    dto.comment = interest.comment;
    dto.status = interest.status;
    dto.createdAt = interest.createdAt;
    dto.updatedAt = interest.updatedAt;
    dto.respondedAt = interest.respondedAt;

    // 사용자 정보 추가
    if (interest.candidate) {
      dto.candidate = {
        id: interest.candidate.id,
        firstName: interest.candidate.firstName,
        lastName: interest.candidate.lastName,
        email: interest.candidate.email,
      };
    }

    if (interest.referrer) {
      dto.referrer = {
        id: interest.referrer.id,
        firstName: interest.referrer.firstName,
        lastName: interest.referrer.lastName,
        email: interest.referrer.email,
      };
    }

    return dto;
  }
}
