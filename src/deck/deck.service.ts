import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Deck, SourceType } from '../entities/deck.entity';
import { Resume, ResumeSectionType } from '../entities/resume.entity';
import { RequirementResponse } from '../entities/requirement-response.entity';

@Injectable()
export class DeckService {
  private readonly logger = new Logger(DeckService.name);

  constructor(
    @InjectRepository(Deck)
    private deckRepository: Repository<Deck>,
    @InjectRepository(Resume)
    private resumeRepository: Repository<Resume>,
    @InjectRepository(RequirementResponse)
    private requirementResponseRepository: Repository<RequirementResponse>,
  ) {}

  /**
   * 새로운 deck 기록 생성
   */
  async createDeck(data: {
    referrerId: string;
    candidateId: string;
    source: SourceType;
  }): Promise<Deck> {
    const deck = this.deckRepository.create(data);
    const savedDeck = await this.deckRepository.save(deck);
    
    this.logger.log(`Deck created: ${data.source} for referrer ${data.referrerId} and candidate ${data.candidateId}`);
    return savedDeck;
  }

  /**
   * 추천인의 deck 조회 (상세 정보 포함)
   */
  async getDeckByReferrer(referrerId: string): Promise<Deck[]> {
    return this.deckRepository.find({
      where: { referrerId },
      relations: ['candidate'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * 추천인의 deck 조회 (간소화된 정보)
   */
  async getDeckSummaryByReferrer(referrerId: string): Promise<any[]> {
    try {
      this.logger.log(`Fetching deck summary for referrer: ${referrerId}`);
      
      // 먼저 기본 deck 데이터 조회
      const decks = await this.deckRepository.find({
        where: { referrerId },
        relations: ['candidate'],
        order: { createdAt: 'DESC' }
      });

      this.logger.log(`Found ${decks.length} decks for referrer: ${referrerId}`);

      if (decks.length === 0) {
        this.logger.log('No decks found, returning empty array');
        return [];
      }

      const deckSummaries = [];
      
      for (const deck of decks) {
        try {
          this.logger.log(`Processing deck: ${deck.id}, candidate: ${deck.candidate?.id}`);
          
          if (!deck.candidate) {
            this.logger.warn(`Missing candidate data for deck: ${deck.id}`);
            continue;
          }

          const inDecks = await this.getCandidateDeckCount(deck.candidate.id);
          const skills = await this.getUserSkills(deck.candidate.id);
          
          deckSummaries.push({
            id: deck.id,
            candidateId: deck.candidate.id, // candidate의 userId 추가
            name: `${deck.candidate.firstName || ''} ${deck.candidate.lastName || ''}`.trim() || 'Unknown',
            skills: skills,
            inDecks,
            dateAdded: deck.createdAt,
            isPremium: deck.candidate.subscriptionPurchased === true,
            email: deck.candidate.email,
            status: deck.candidate.status
          });
        } catch (error) {
          this.logger.error(`Error processing deck ${deck.id}:`, error);
          // 개별 deck 처리 실패 시에도 계속 진행
          continue;
        }
      }

      this.logger.log(`Successfully processed ${deckSummaries.length} deck summaries`);
      return deckSummaries;
      
    } catch (error) {
      this.logger.error(`Error in getDeckSummaryByReferrer for referrer ${referrerId}:`, error);
      throw error;
    }
  }

  /**
   * 후보자의 deck 조회
   */
  async getDeckByCandidate(candidateId: string): Promise<Deck[]> {
    return this.deckRepository.find({
      where: { candidateId },
      relations: ['referrer'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * 후보자가 몇 명의 referrer에게 deck에 있는지 계산
   */
  async getCandidateDeckCount(candidateId: string): Promise<number> {
    return this.deckRepository.count({
      where: { candidateId }
    });
  }

  /**
   * 사용자의 skills 가져오기
   */
  async getUserSkills(userId: string): Promise<string[]> {
    try {
      const skills = await this.resumeRepository.find({
        where: {
          userId: userId,
          sectionType: ResumeSectionType.SKILLS,
          isActive: true
        },
        order: { sectionOrder: 'ASC' }
      });

      return skills
        .map(skill => skill.sectionData?.skillName)
        .filter(skillName => skillName && skillName.trim() !== '');
    } catch (error) {
      this.logger.error(`Error fetching skills for user ${userId}:`, error);
      return [];
    }
  }

  /**
   * 후보자의 referrer 정보 조회 (submission count, last submission date 포함)
   */
  async getReferrersByCandidate(candidateId: string): Promise<any[]> {
    try {
      this.logger.log(`Fetching referrers for candidate: ${candidateId}`);
      
      // 먼저 기본 deck 데이터 조회
      const decks = await this.deckRepository.find({
        where: { candidateId },
        relations: ['referrer'],
        order: { createdAt: 'DESC' }
      });

      this.logger.log(`Found ${decks.length} decks for candidate: ${candidateId}`);

      if (decks.length === 0) {
        this.logger.log('No decks found, returning empty array');
        return [];
      }

      const referrersData = [];
      
      for (const deck of decks) {
        try {
          this.logger.log(`Processing deck: ${deck.id}, referrer: ${deck.referrer?.id}`);
          
          if (!deck.referrer) {
            this.logger.warn(`Missing referrer data for deck: ${deck.id}`);
            continue;
          }

          // 해당 referrer가 이 candidate를 몇 번 제출했는지 확인
          const submissions = await this.requirementResponseRepository.count({
            where: {
              referrerId: deck.referrer.id,
              candidateId: candidateId
            }
          });

          // 가장 최근 제출 날짜 가져오기
          const lastSubmission = await this.requirementResponseRepository.findOne({
            where: {
              referrerId: deck.referrer.id,
              candidateId: candidateId
            },
            order: { createdAt: 'DESC' }
          });

          const lastSubmitted = lastSubmission ? lastSubmission.createdAt : null;
          
          referrersData.push({
            referrerName: `${deck.referrer.firstName || ''} ${deck.referrer.lastName || ''}`.trim() || 'Unknown',
            submissions: submissions,
            lastSubmitted: lastSubmitted,
            dateConnected: deck.createdAt
          });
        } catch (error) {
          this.logger.error(`Error processing deck ${deck.id}:`, error);
          // 개별 deck 처리 실패 시에도 계속 진행
          continue;
        }
      }

      this.logger.log(`Successfully processed ${referrersData.length} referrer summaries`);
      return referrersData;
      
    } catch (error) {
      this.logger.error(`Error in getReferrersByCandidate for candidate ${candidateId}:`, error);
      throw error;
    }
  }
}
