import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Requirement, RequirementStatus, WorkStyle } from '../../entities/requirement.entity';
import { CreateRequirementDto } from '../dto/create-requirement.dto';
import { SearchRequirementDto } from '../dto/search-requirement.dto';
import { UserRole } from '../../common/enums/user-role.enum';

@Injectable()
export class RequirementsService {
  constructor(
    @InjectRepository(Requirement)
    private requirementRepository: Repository<Requirement>,
  ) {}

  async create(createRequirementDto: CreateRequirementDto, userId: string): Promise<Requirement> {
    // userId로 referrer 사용자 확인
    const referrer = await this.requirementRepository.manager
      .createQueryBuilder()
      .select('u.id')
      .from('users', 'u')
      .where('u.id = :userId', { userId })
      .andWhere('u.role = :role', { role: UserRole.REFERRER })
      .getOne();

    if (!referrer) {
      throw new BadRequestException('User is not a referrer');
    }

    const requirement = this.requirementRepository.create({
      ...createRequirementDto,
      referrerId: userId, // 직접 userId 사용 (users 테이블의 id)
      status: RequirementStatus.OPEN,
    });

    return this.requirementRepository.save(requirement);
  }

  async findOne(id: string): Promise<Requirement> {
    const requirement = await this.requirementRepository.findOne({
      where: { id },
      relations: ['referrer'],
    });

    if (!requirement) {
      throw new NotFoundException('Requirement not found');
    }

    return requirement;
  }

  async search(searchDto: SearchRequirementDto, userId: string): Promise<Requirement[]> {
    const queryBuilder = this.requirementRepository
      .createQueryBuilder('requirement')
      .leftJoinAndSelect('requirement.referrer', 'referrer')
      .where('requirement.status = :status', { status: RequirementStatus.OPEN })
      .andWhere('requirement.referrerId != :userId', { userId }); // 자신이 작성한 requirement 제외

    // scope: public | circle (default: public)
    const scope = searchDto.scope || 'public';
    if (scope === 'public') {
      queryBuilder.andWhere('requirement.visibility = :publicVis', { publicVis: 'public' });
    } else if (scope === 'circle') {
      queryBuilder.andWhere(
        `(
          requirement.visibility = :publicVis
          OR (
            requirement.visibility = :circleVis AND EXISTS (
              SELECT 1 FROM referrer_circle rc
              WHERE rc.status = :accepted
                AND (
                  (rc."inviterId" = :userId AND rc."accepterId" = requirement."referrerId")
                  OR (rc."accepterId" = :userId AND rc."inviterId" = requirement."referrerId")
                )
            )
          )
        )`,
        { publicVis: 'public', circleVis: 'circle', accepted: 'accepted', userId }
      );
    }

    // Skills 필터링 (콤마로 구분된 문자열을 배열로 변환)
    if (searchDto.skills) {
      const skillsArray = searchDto.skills.split(',').map(skill => skill.trim()).filter(skill => skill.length > 0);
      if (skillsArray.length > 0) {
        queryBuilder.andWhere('requirement.skills && :skills', { skills: skillsArray });
      }
    }

    // Location 필터링
    if (searchDto.location) {
      queryBuilder.andWhere('requirement.location ILIKE :location', { 
        location: `%${searchDto.location}%` 
      });
    }

    // Work Style 필터링 (콤마로 구분된 문자열을 배열로 변환)
    if (searchDto.workStyle) {
      const workStyleArray = searchDto.workStyle.split(',').map(style => style.trim()).filter(style => style.length > 0);
      if (workStyleArray.length > 0) {
        queryBuilder.andWhere('requirement.workStyle && :workStyle', { 
          workStyle: workStyleArray 
        });
      }
    }

    // 정렬
    switch (searchDto.sortBy) {
      case 'newest':
        queryBuilder.orderBy('requirement.createdAt', 'DESC');
        break;
      case 'oldest':
        queryBuilder.orderBy('requirement.createdAt', 'ASC');
        break;
      case 'mostResponses':
        // 응답 수로 정렬 (서브쿼리 사용)
        queryBuilder
          .addSelect('(SELECT COUNT(*) FROM requirement_responses rr WHERE rr."requirementId" = requirement.id)', 'responseCount')
          .orderBy('responseCount', 'DESC')
          .addOrderBy('requirement.createdAt', 'DESC');
        break;
      default:
        queryBuilder.orderBy('requirement.createdAt', 'DESC');
    }

    // 페이지네이션 (문자열을 숫자로 변환)
    if (searchDto.page && searchDto.limit) {
      const page = parseInt(searchDto.page, 10);
      const limit = parseInt(searchDto.limit, 10);
      
      if (!isNaN(page) && !isNaN(limit) && page >= 1 && limit >= 1) {
        const offset = (page - 1) * limit;
        queryBuilder.offset(offset).limit(limit);
      }
    }

    return queryBuilder.getMany();
  }

  async report(id: string, userId: string, reportDto: any): Promise<void> {
    // Requirement 존재 확인
    const requirement = await this.findOne(id);
    
    // 자신의 requirement는 신고할 수 없음
    if (requirement.referrerId === userId) {
      throw new BadRequestException('Cannot report your own requirement');
    }

    // TODO: 신고 엔티티 생성 및 저장
    // const report = this.reportRepository.create({
    //   requirementId: id,
    //   reporterId: userId,
    //   reason: reportDto.reason,
    //   description: reportDto.description,
    // });
    // await this.reportRepository.save(report);
    
    // 임시로 성공 응답만 반환
    return;
  }

  async getMyRequirements(userId: string): Promise<any[]> {
    const requirements = await this.requirementRepository.find({
      where: { referrerId: userId },
      relations: ['referrer'],
      order: { createdAt: 'DESC' },
      select: {
        id: true,
        createdAt: true,
        updatedAt: true,
        title: true,
        overview: true,
        skills: true,
        desiredSkills: true,
        location: true,
        status: true,
        workStyle: true,
        salaryCeiling: true,
        referrerId: true,
        closingDate: true,
        visibility: true,
        referrer: {
          id: true,
          createdAt: true,
          updatedAt: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          status: true,
          lastLoginAt: true,
          emailVerified: true,
          stripeAccountId: true,
          stripeOnboardingStatus: true,
          stripeCustomerId: true,
          currentPlanCode: true,
          stripeSubscriptionId: true,
          subscriptionPurchased: true,
          subscriptionStartDate: true,
          subscriptionEndDate: true,
          nextBillingDate: true,
          subscriptionInterval: true,
          candidateCap: true,
          purchasedCandidates: true,
          balance: true,
        }
      }
    });

    // 각 requirement에 대한 응답 수와 통계 정보 추가
    const requirementsWithStats = await Promise.all(
      requirements.map(async (requirement) => {
        const responseCount = await this.requirementRepository.manager
          .createQueryBuilder()
          .select('COUNT(*)', 'count')
          .from('requirement_responses', 'rr')
          .where('rr."requirementId" = :requirementId', { requirementId: requirement.id })
          .getRawOne();

        const pendingCount = await this.requirementRepository.manager
          .createQueryBuilder()
          .select('COUNT(*)', 'count')
          .from('requirement_responses', 'rr')
          .where('rr."requirementId" = :requirementId', { requirementId: requirement.id })
          .andWhere('rr.status = :status', { status: 'pending' })
          .getRawOne();

        const approvedCount = await this.requirementRepository.manager
          .createQueryBuilder()
          .select('COUNT(*)', 'count')
          .from('requirement_responses', 'rr')
          .where('rr."requirementId" = :requirementId', { requirementId: requirement.id })
          .andWhere('rr.status = :status', { status: 'approved' })
          .getRawOne();

        return {
          ...requirement,
          responseCount: parseInt(responseCount?.count || '0'),
          pendingCount: parseInt(pendingCount?.count || '0'),
          approvedCount: parseInt(approvedCount?.count || '0'),
        };
      })
    );

    return requirementsWithStats;
  }

  /**
   * Close a requirement by setting its status to CLOSED
   */
  async closeRequirement(id: string, userId: string): Promise<Requirement> {
    const requirement = await this.requirementRepository.findOne({
      where: { id },
    });

    if (!requirement) {
      throw new NotFoundException('Requirement not found');
    }

    // Only the author can close their own requirement
    if (requirement.referrerId !== userId) {
      throw new BadRequestException('Only the author can close this requirement');
    }

    // Check if requirement is already closed
    if (requirement.status === RequirementStatus.CLOSED) {
      throw new BadRequestException('Requirement is already closed');
    }

    // Close the requirement
    requirement.status = RequirementStatus.CLOSED;
    
    return this.requirementRepository.save(requirement);
  }
}
