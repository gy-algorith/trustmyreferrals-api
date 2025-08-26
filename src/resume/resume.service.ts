import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Resume, ResumeSectionType } from '../entities/resume.entity';
import { ResumeValidation } from '../entities/resume-validation.entity';
import { Deck } from '../entities/deck.entity';
import { WorkExperienceDto, EducationDto } from './dto/resume-section.dto';

@Injectable()
export class ResumeService {
  private readonly logger = new Logger(ResumeService.name);

  constructor(
    @InjectRepository(Resume)
    private resumeRepository: Repository<Resume>,
    @InjectRepository(ResumeValidation)
    private resumeValidationRepository: Repository<ResumeValidation>,
    @InjectRepository(Deck)
    private deckRepository: Repository<Deck>,
    private configService: ConfigService,
  ) {}

  /**
   * 새로운 resume section 생성
   */
  async createResumeSection(data: {
    userId: string;
    sectionType: ResumeSectionType;
    sectionOrder: number;
    sectionData: Record<string, any>;
    isActive?: boolean;
  }): Promise<Resume> {
    const resume = this.resumeRepository.create({
      ...data,
      isActive: data.isActive ?? true,
    });
    const savedResume = await this.resumeRepository.save(resume);
    
    this.logger.log(`Resume section created: ${data.sectionType} for user ${data.userId}`);
    return savedResume;
  }

  /**
   * 특정 resume section 조회
   */
  async getResumeSection(id: string): Promise<Resume | null> {
    return this.resumeRepository.findOne({
      where: { id, isActive: true },
      relations: ['validations'],
    });
  }

  /**
   * 사용자의 모든 resume sections 조회 (순서대로)
   */
  async getUserResumeSections(userId: string): Promise<Resume[]> {
    return this.resumeRepository.find({
      where: { userId, isActive: true },
      order: { sectionOrder: 'ASC' },
      relations: ['validations'],
    });
  }

  /**
   * 사용자의 이력서를 구조화된 형태로 반환 (공통 로직)
   */
  async getStructuredResume(userId: string) {
    const sections = await this.getUserResumeSections(userId);

    // Structure by sections
    const structuredResume = {
      professionalSummary: null,
      workExperience: [],
      education: [],
      skills: [],
      awards: []
    };

    sections.forEach(section => {
      switch (section.sectionType) {
        case ResumeSectionType.PROFESSIONAL_SUMMARY:
          structuredResume.professionalSummary = {
            id: section.id,
            summary: section.sectionData.summary
          };
          break;
        case ResumeSectionType.WORK_EXPERIENCE:
          structuredResume.workExperience.push({
            id: section.id,
            title: section.sectionData.title,
            company: section.sectionData.company,
            dateRange: section.sectionData.dateRange,
            description: section.sectionData.description,
            order: section.sectionOrder
          });
          break;
        case ResumeSectionType.EDUCATION:
          structuredResume.education.push({
            id: section.id,
            degreeType: section.sectionData.degreeType,
            fieldOfStudy: section.sectionData.fieldOfStudy,
            institution: section.sectionData.institution,
            startYear: section.sectionData.startYear,
            endYear: section.sectionData.endYear,
            description: section.sectionData.description,
            order: section.sectionOrder
          });
          break;
        case ResumeSectionType.SKILLS:
          structuredResume.skills.push({
            id: section.id,
            skillName: section.sectionData.skillName,
            order: section.sectionOrder
          });
          break;
        case ResumeSectionType.AWARDS_AND_CERTIFICATIONS:
          structuredResume.awards.push({
            id: section.id,
            awardName: section.sectionData.awardName,
            issuingOrganization: section.sectionData.issuingOrganization,
            dateAwarded: section.sectionData.dateAwarded,
            description: section.sectionData.description,
            order: section.sectionOrder
          });
          break;
      }
    });

    // Sort by order
    structuredResume.workExperience.sort((a, b) => a.order - b.order);
    structuredResume.education.sort((a, b) => a.order - b.order);
    structuredResume.skills.sort((a, b) => a.order - b.order);
    structuredResume.awards.sort((a, b) => a.order - b.order);

    return structuredResume;
  }

  /**
   * Referrer가 특정 candidate의 이력서에 접근할 권한이 있는지 확인
   */
  async canAccessCandidateResume(referrerId: string, candidateId: string): Promise<boolean> {
    this.logger.log(`Checking access: referrerId=${referrerId}, candidateId=${candidateId}`);
    
    // Deck 관계가 존재하는지 확인
    const deck = await this.deckRepository.findOne({
      where: { referrerId, candidateId },
    });
    
    this.logger.log(`Deck query result: ${JSON.stringify(deck)}`);
    
    const hasAccess = !!deck;
    this.logger.log(`Access granted: ${hasAccess}`);
    
    return hasAccess;
  }

  /**
   * 특정 타입의 resume section 조회
   */
  async getResumeSectionByType(userId: string, sectionType: ResumeSectionType): Promise<Resume | null> {
    return this.resumeRepository.findOne({
      where: { userId, sectionType, isActive: true },
      relations: ['validations'],
    });
  }

  /**
   * Resume section 업데이트
   */
  async updateResumeSection(
    id: string,
    data: Partial<Pick<Resume, 'sectionData' | 'sectionOrder' | 'isActive'>>
  ): Promise<Resume | null> {
    const resume = await this.resumeRepository.findOne({
      where: { id },
    });

    if (!resume) {
      return null;
    }

    Object.assign(resume, data);
    const savedResume = await this.resumeRepository.save(resume);
    
    this.logger.log(`Resume section updated: ${resume.sectionType} for id ${id}`);
    return savedResume;
  }

  /**
   * Resume section 비활성화 (삭제 대신)
   */
  async deactivateResumeSection(id: string): Promise<boolean> {
    const result = await this.resumeRepository.update(
      { id },
      { isActive: false }
    );
    
    if (result.affected > 0) {
      this.logger.log(`Resume section deactivated: id ${id}`);
      return true;
    }
    return false;
  }

  /**
   * Resume validation 생성
   */
  async createValidation(data: {
    referrerId: string;
    suggestionText: string;
    resumeId: string;
    isActive?: boolean;
  }): Promise<ResumeValidation> {
    // Resume 엔티티를 먼저 찾아야 합니다
    const resume = await this.resumeRepository.findOne({
      where: { id: data.resumeId },
    });

    if (!resume) {
      throw new NotFoundException(`Resume section with ID ${data.resumeId} not found`);
    }

    const validation = this.resumeValidationRepository.create({
      resume: resume,
      referrerId: data.referrerId,
      text: data.suggestionText,
      isActive: data.isActive ?? true,
    });
    const savedValidation = await this.resumeValidationRepository.save(validation);
    
    this.logger.log(`Resume validation created for resume ${data.resumeId}`);
    return savedValidation;
  }

  /**
   * Resume section의 validations 조회
   */
  async getResumeValidations(resumeId: string): Promise<ResumeValidation[]> {
    // Resume 엔티티를 먼저 찾아야 합니다
    const resume = await this.resumeRepository.findOne({
      where: { id: resumeId },
    });

    if (!resume) {
      return [];
    }

    return this.resumeValidationRepository.find({
      where: { resume: resume, isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Resume validation 업데이트
   */
  async updateValidation(
    validationId: string,
    data: Partial<Pick<ResumeValidation, 'text' | 'isActive'>>
  ): Promise<ResumeValidation | null> {
    const validation = await this.resumeValidationRepository.findOne({
      where: { id: validationId },
    });

    if (!validation) {
      return null;
    }

    Object.assign(validation, data);
    const savedValidation = await this.resumeValidationRepository.save(validation);
    
    this.logger.log(`Resume validation updated: ${validationId}`);
    return savedValidation;
  }

  /**
   * Resume validation 비활성화
   */
  async deactivateValidation(validationId: string): Promise<boolean> {
    const result = await this.resumeValidationRepository.update(
      { id: validationId },
      { isActive: false }
    );
    
    if (result.affected > 0) {
      this.logger.log(`Resume validation deactivated: ${validationId}`);
      return true;
    }
    return false;
  }

  /**
   * 특정 validation 조회
   */
  async getValidationById(validationId: string): Promise<ResumeValidation | null> {
    return this.resumeValidationRepository.findOne({
      where: { id: validationId, isActive: true },
    });
  }

  /**
   * 사용자의 모든 resume sections 비활성화 (전체 삭제)
   */
  async deactivateAllUserResumeSections(userId: string): Promise<{ success: boolean; count: number }> {
    try {
      const result = await this.resumeRepository.update(
        { userId, isActive: true },
        { isActive: false }
      );
      
      if (result.affected > 0) {
        this.logger.log(`All resume sections deactivated for user: ${userId}, count: ${result.affected}`);
        return { success: true, count: result.affected };
      }
      
      return { success: true, count: 0 };
    } catch (error) {
      this.logger.error(`Failed to deactivate resume sections for user: ${userId}`, error);
      return { success: false, count: 0 };
    }
  }

  /**
   * PDF 파일을 Gemini API로 파싱하여 이력서 섹션 생성
   */
  async parsePdfAndCreateSections(
    userId: string,
    pdfBuffer: Buffer,
  ): Promise<{
    success: boolean;
    message: string;
    data?: {
      summaryCreated: boolean;
      workExperienceCount: number;
      educationCount: number;
      totalSections: number;
    };
  }> {
    try {
      this.logger.log(`Starting PDF parsing for user ${userId}, buffer size: ${pdfBuffer.length}`);
      
      // 1. Gemini API 호출하여 PDF 파싱
      const parsedData = await this.callGeminiApi(pdfBuffer);
      
      // 2. 기존 섹션이 있는지 확인
      const existingSections = await this.getUserResumeSections(userId);
      if (existingSections.length > 0) {
        return {
          success: false,
          message: 'Resume sections already exist. Please delete existing sections first.',
        };
      }

      // 3. 파싱된 데이터로 섹션 생성
      const result = await this.createSectionsFromParsedData(userId, parsedData);
      
      return {
        success: true,
        message: 'Resume sections created successfully from PDF',
        data: result,
      };
    } catch (error) {
      this.logger.error(`Failed to parse PDF and create sections for user ${userId}:`, error);
      return {
        success: false,
        message: `Failed to process PDF: ${error.message}`,
      };
    }
  }

  /**
   * Gemini API 호출하여 PDF 파싱
   */
  private async callGeminiApi(pdfBuffer: Buffer): Promise<{
    summary: string;
    work_experience: Array<{
      title: string;
      company: string;
      date_range: string;
      description: string;
    }>;
    education: Array<{
      degree_type: string;
      field_of_study: string;
      institution: string;
      start_year: string;
      end_year: string;
    }>;
  }> {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    this.logger.log(`GEMINI_API_KEY length: ${apiKey ? apiKey.length : 0}`);
    
    if (!apiKey) {
      this.logger.error('GEMINI_API_KEY not found in environment variables');
      throw new BadRequestException('GEMINI_API_KEY not configured');
    }

    const base64Pdf = pdfBuffer.toString('base64');
    
    const prompt = `You are an expert resume parser. Analyze the provided resume PDF and extract the key information into the provided JSON schema. Ensure all extracted data strictly adheres to the schema's data types and structure. For work experience, summarize responsibilities and achievements into concise descriptions. For education, extract all specified fields. List all work experience and education items in reverse chronological order (most recent first).`;

    const payload = {
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: 'application/pdf',
                data: base64Pdf,
              },
            },
          ],
        },
      ],
      generationConfig: {
        response_mime_type: 'application/json',
        response_schema: {
          type: 'OBJECT',
          properties: {
            summary: {
              type: 'STRING',
              description: 'A professional summary of the candidate.',
            },
            work_experience: {
              type: 'ARRAY',
              description: 'A list of professional experiences.',
              items: {
                type: 'OBJECT',
                properties: {
                  title: { type: 'STRING', description: 'Job title.' },
                  company: { type: 'STRING', description: 'Company name.' },
                  date_range: { type: 'STRING', description: 'Employment dates, e.g., "May 2020 - Present".' },
                  description: { type: 'STRING', description: 'A summary of key responsibilities and achievements.' },
                },
                required: ['title', 'company', 'date_range', 'description'],
              },
            },
            education: {
              type: 'ARRAY',
              description: 'A list of educational qualifications.',
              items: {
                type: 'OBJECT',
                properties: {
                  degree_type: { type: 'STRING', description: 'The type of degree, e.g., Bachelor of Science, Master of Arts.' },
                  field_of_study: { type: 'STRING', description: 'The major or field of study, e.g., Computer Science.' },
                  institution: { type: 'STRING', description: 'The name of the university or college.' },
                  start_year: { type: 'STRING', description: 'The starting year of attendance.' },
                  end_year: { type: 'STRING', description: 'The ending or graduation year.' },
                },
                required: ['degree_type', 'field_of_study', 'institution', 'end_year'],
              },
            },
          },
          required: ['summary', 'work_experience', 'education'],
        },
      },
    };

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    const parsedText = result.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!parsedText) {
      throw new Error('Invalid response from Gemini API');
    }

    const resumeData = JSON.parse(parsedText);
    return resumeData;
  }

  /**
   * 파싱된 데이터로 섹션 생성
   */
  private async createSectionsFromParsedData(
    userId: string,
    parsedData: {
      summary: string;
      work_experience: Array<{
        title: string;
        company: string;
        date_range: string;
        description: string;
      }>;
      education: Array<{
        degree_type: string;
        field_of_study: string;
        institution: string;
        start_year: string;
        end_year: string;
      }>;
    },
  ): Promise<{
    summaryCreated: boolean;
    workExperienceCount: number;
    educationCount: number;
    totalSections: number;
  }> {
    let summaryCreated = false;
    let workExperienceCount = 0;
    let educationCount = 0;

    // 1. Professional Summary 생성
    if (parsedData.summary) {
      await this.createResumeSection({
        userId,
        sectionType: ResumeSectionType.PROFESSIONAL_SUMMARY,
        sectionOrder: 0,
        sectionData: { summary: parsedData.summary },
      });
      summaryCreated = true;
    }

    // 2. Work Experience 섹션들 생성
    if (parsedData.work_experience && parsedData.work_experience.length > 0) {
      for (let i = 0; i < parsedData.work_experience.length; i++) {
        const exp = parsedData.work_experience[i];
        await this.createResumeSection({
          userId,
          sectionType: ResumeSectionType.WORK_EXPERIENCE,
          sectionOrder: i, // 0부터 시작
          sectionData: {
            title: exp.title,
            company: exp.company,
            dateRange: exp.date_range,
            description: exp.description,
          },
        });
        workExperienceCount++;
      }
    }

    // 3. Education 섹션들 생성
    if (parsedData.education && parsedData.education.length > 0) {
      for (let i = 0; i < parsedData.education.length; i++) {
        const edu = parsedData.education[i];
        await this.createResumeSection({
          userId,
          sectionType: ResumeSectionType.EDUCATION,
          sectionOrder: i, // 0부터 시작
          sectionData: {
            degreeType: edu.degree_type,
            fieldOfStudy: edu.field_of_study,
            institution: edu.institution,
            startYear: parseInt(edu.start_year) || new Date().getFullYear(),
            endYear: parseInt(edu.end_year) || new Date().getFullYear(),
            description: '',
          },
        });
        educationCount++;
      }
    }

    // 4. Skills와 Awards 섹션은 생성하지 않음 (사용자가 필요할 때 추가)

    return {
      summaryCreated,
      workExperienceCount,
      educationCount,
      totalSections: (summaryCreated ? 1 : 0) + workExperienceCount + educationCount,
    };
  }
}
