import { ResumeSectionType } from '../../entities/resume.entity';

export interface CreateResumeSectionData {
  userId: string;
  sectionType: ResumeSectionType;
  sectionOrder: number;
  sectionData: Record<string, any>;
}

export interface ValidationResult {
  isValid: boolean;
  message?: string;
}

export class ResumeSectionUtils {
  /**
   * 다음 순서 계산
   */
  static calculateNextOrder(existingSections: any[], sectionType: ResumeSectionType): number {
    const filteredSections = existingSections.filter(section => section.sectionType === sectionType);
    // 0부터 시작하는 order 계산
    return filteredSections.length;
  }

  /**
   * 연도 validation
   */
  static validateYearRange(startYear: number, endYear: number): ValidationResult {
    if (startYear > endYear) {
      return { isValid: false, message: 'Start year must be less than end year.' };
    }
    
    if (startYear < 1900 || endYear > new Date().getFullYear() + 10) {
      return { isValid: false, message: 'Year must be between 1900 and current year + 10.' };
    }
    
    return { isValid: true };
  }

  /**
   * 날짜 형식 validation (YYYY-MM 또는 YYYY-MM-DD)
   */
  static validateDateFormat(date: string): ValidationResult {
    const dateRegex = /^\d{4}-\d{2}(-\d{2})?$/;
    if (!dateRegex.test(date)) {
      return { isValid: false, message: 'Date must be in YYYY-MM or YYYY-MM-DD format.' };
    }
    
    return { isValid: true };
  }

  /**
   * 스킬 이름 validation
   */
  static validateSkillName(skillName: string): ValidationResult {
    if (!/^[a-zA-Z0-9\s\+\#\-\_\.]+$/.test(skillName)) {
      return { 
        isValid: false, 
        message: 'Skill name can only contain letters, numbers, spaces, +, #, -, _, .' 
      };
    }
    
    return { isValid: true };
  }

  /**
   * PDF 파일 검증
   */
  static validatePdfFile(file: Express.Multer.File): ValidationResult {
    if (!file) {
      return { isValid: false, message: 'No file uploaded' };
    }

    if (file.mimetype !== 'application/pdf') {
      return { isValid: false, message: 'Only PDF files are allowed' };
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB
      return { isValid: false, message: 'File size must be less than 10MB' };
    }

    return { isValid: true };
  }

  /**
   * Gemini API 응답 데이터 검증
   */
  static validateGeminiResponse(data: any): ValidationResult {
    if (!data || typeof data !== 'object') {
      return { isValid: false, message: 'Invalid response format from Gemini API' };
    }

    if (!data.summary || typeof data.summary !== 'string') {
      return { isValid: false, message: 'Missing or invalid summary in response' };
    }

    if (!Array.isArray(data.work_experience)) {
      return { isValid: false, message: 'Missing or invalid work experience array' };
    }

    if (!Array.isArray(data.education)) {
      return { isValid: false, message: 'Missing or invalid education array' };
    }

    // Work experience 항목 검증
    for (const exp of data.work_experience) {
      if (!exp.title || !exp.company || !exp.date_range || !exp.description) {
        return { isValid: false, message: 'Invalid work experience item structure' };
      }
    }

    // Education 항목 검증
    for (const edu of data.education) {
      if (!edu.degree_type || !edu.field_of_study || !edu.institution || !edu.end_year) {
        return { isValid: false, message: 'Invalid education item structure' };
      }
    }

    return { isValid: true };
  }

  /**
   * 연도 문자열을 숫자로 변환
   */
  static parseYear(yearString: string): number {
    const year = parseInt(yearString);
    if (isNaN(year) || year < 1900 || year > new Date().getFullYear() + 10) {
      return new Date().getFullYear();
    }
    return year;
  }

  /**
   * 날짜 범위 문자열 정규화
   */
  static normalizeDateRange(dateRange: string): string {
    // "May 2020 - Present" 형태를 "2020 - Present" 형태로 변환
    return dateRange.trim();
  }

  /**
   * 성공 응답 생성
   */
  static createSuccessResponse(data: any, message: string) {
    return {
      success: true,
      data,
      message
    };
  }

  /**
   * 실패 응답 생성
   */
  static createErrorResponse(message: string) {
    return {
      success: false,
      message
    };
  }
}
