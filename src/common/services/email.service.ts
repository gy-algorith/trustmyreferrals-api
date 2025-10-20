import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import {
  EmailVerification,
  EmailVerificationPurpose,
} from '../../entities/email-verification.entity';
import { Settings } from '../../entities/settings.entity';

/**
 * Interface for email verification result
 */
export interface EmailVerificationResult {
  success: boolean;
  verificationId: string;
  message: string;
}

/**
 * Interface for verification status
 */
export interface VerificationStatus {
  success: boolean;
  message: string;
  email?: string;
}

/**
 * Service for sending emails using PHPMailer-style approach with nodemailer
 * This service mimics the PHP PHPMailer configuration and behavior
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly maxAttempts = 3;
  private readonly attemptCounts: Map<string, number> = new Map();

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(EmailVerification)
    private readonly emailVerificationRepository: Repository<EmailVerification>,
    @InjectRepository(Settings)
    private readonly settingsRepository: Repository<Settings>,
  ) {
    this.logger.log('EmailService initialized with PHPMailer-style configuration');
  }

  /**
   * Frontend URL 설정값 가져오기
   * @param key 설정 키
   * @param defaultValue 기본값
   * @returns 설정값
   */
  private async getFrontendSetting(key: string, defaultValue: string = ''): Promise<string> {
    try {
      const setting = await this.settingsRepository.findOne({ where: { key, isActive: true } });
      return setting ? setting.value : defaultValue;
    } catch (error) {
      this.logger.warn(`Failed to get frontend setting ${key}: ${error.message}, using default: ${defaultValue}`);
      return defaultValue;
    }
  }

  /**
   * Frontend URL 생성
   * @param path 경로
   * @returns 완전한 Frontend URL
   */
  private async buildFrontendUrl(path: string): Promise<string> {
    const baseUrl = await this.getFrontendSetting('frontend_base_url');
    return `${baseUrl}${path}`;
  }

  /**
   * 이메일 템플릿 로드 (PHP 스타일)
   * @param templateName 템플릿 파일 이름
   * @returns 템플릿 내용
   */
  private loadEmailTemplate(templateName: string): string {
    // 탐색할 잠재 경로들 (PHP 스타일)
    const candidatePaths = [
      path.join(process.cwd(), 'dist', 'src', 'common', 'templates', 'email', templateName),
      path.join(__dirname, '..', 'templates', 'email', templateName),
      path.join(process.cwd(), 'src', 'common', 'templates', 'email', templateName),
      path.join(process.cwd(), 'templates', 'email', templateName),
    ];

    for (const p of candidatePaths) {
      try {
        if (fs.existsSync(p)) {
          this.logger.log(`Loading email template from: ${p}`);
          return fs.readFileSync(p, 'utf8');
        }
      } catch {
        // ignore and try next path
      }
    }

    // 템플릿 파일이 없을 경우 기본 인라인 템플릿 사용 (PHP 스타일)
    this.logger.warn(`Email template not found; using default inline template: ${templateName}`);
    return this.getDefaultTemplate(templateName);
  }

  /**
   * 기본 템플릿 반환 (PHP 스타일)
   * @param templateName 템플릿 이름
   * @returns 기본 템플릿
   */
  private getDefaultTemplate(templateName: string): string {
    switch (templateName) {
      case 'verification-email.template.html':
        return this.getVerificationEmailTemplate();
      case 'password-reset.template.html':
        return this.getPasswordResetTemplate();
      default:
        return this.getVerificationEmailTemplate();
    }
  }

  /**
   * 인증 이메일 템플릿 (PHP 스타일)
   * @returns HTML 템플릿
   */
  private getVerificationEmailTemplate(): string {
    return `
      <html>
        <body>
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto;">
            <h2>Email verification</h2>
            <p>Your verification code:</p>
            <div style="font-size: 28px; font-weight: 700; letter-spacing: 6px;">{{verificationCode}}</div>
            <p style="margin-top: 24px;">Or click the link below to verify:</p>
            <p><a href="{{verificationLink}}" target="_blank">Verify your email</a></p>
            <p style="color:#6b7280; font-size: 12px; margin-top: 24px;">This code will expire in 30 minutes.</p>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * 비밀번호 재설정 이메일 템플릿 (PHP 스타일)
   * @returns HTML 템플릿
   */
  private getPasswordResetTemplate(): string {
    return `
      <html>
        <body>
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #1f2937; margin-bottom: 24px;">Hello,</h2>
            <p style="color: #374151; line-height: 1.6; margin-bottom: 20px;">
              You requested a password reset. Please click the link below to create a new password:
            </p>
            <div style="margin: 30px 0;">
              <a href="{{resetLink}}" 
                 style="display: inline-block; background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">
                Reset Password
              </a>
            </div>
            <p style="color: #6b7280; font-size: 14px; line-height: 1.5; margin-bottom: 20px;">
              If you did not request this, please ignore this email.
            </p>
            <p style="color: #6b7280; font-size: 14px; line-height: 1.5; margin-bottom: 20px;">
              This link will expire in 1 hour.
            </p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            <p style="color: #9ca3af; font-size: 12px; text-align: center;">
              Thanks,<br>
              The PreviewMe.xyz Team
            </p>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * 비밀번호 재설정 이메일 발송 (PHP 스타일)
   * @param email 이메일 주소
   * @param resetToken 비밀번호 재설정 토큰
   * @returns 발송 성공 여부
   */
  async sendPasswordResetEmail(email: string, resetToken: string): Promise<boolean> {
    try {
      const resetPath = await this.getFrontendSetting('frontend_reset_password_path');
      const frontendUrl = await this.buildFrontendUrl(resetPath);
      const resetLink = `${frontendUrl}?token=${resetToken}`;

      // 비밀번호 재설정 이메일 템플릿 로드
      const htmlTemplate = this.loadEmailTemplate('password-reset.template.html');
      const htmlContent = this.applyTemplateData(htmlTemplate, {
        resetLink: resetLink
      });

      // 이메일 발송 (PHP 스타일)
      const emailSent = await this.sendEmail(
        email,
        'Password Reset Request for PreviewMe.xyz',
        htmlContent
      );

      if (emailSent) {
        this.logger.log(`Password reset email sent successfully to: ${email}`);
        return true;
      } else {
        this.logger.warn(`Failed to send password reset email to: ${email}`);
        return false;
      }
    } catch (error) {
      this.logger.error(
        `Error sending password reset email to ${email}: ${error.message}`,
        error.stack,
      );
      return false;
    }
  }

  /**
   * 템플릿에 데이터 적용 (PHP 스타일)
   * @param template 템플릿 문자열
   * @param data 적용할 데이터 객체
   * @returns 데이터가 적용된 템플릿
   */
  private applyTemplateData(
    template: string,
    data: Record<string, string>,
  ): string {
    let result = template;
    for (const [key, value] of Object.entries(data)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, value);
    }
    return result;
  }

  /**
   * Get verification record by ID
   * @param verificationId Verification ID
   * @returns Verification record or null if not found
   */
  async getVerificationById(verificationId: string) {
    return this.emailVerificationRepository.findOneBy({ verificationId });
  }

  /**
   * Mark verification as used
   * @param verificationId Verification ID
   */
  async markVerificationAsUsed(verificationId: string) {
    await this.emailVerificationRepository.update(
      { verificationId },
      { isUsed: true }
    );
  }

  /**
   * Send verification email with a verification link (PHP 스타일)
   * @param email Email address to send verification to
   * @param purpose Verification purpose
   * @returns Verification result
   */
  async sendVerificationEmail(
    email: string,
    purpose: EmailVerificationPurpose = EmailVerificationPurpose.REGISTER,
  ): Promise<string> {
    try {
      // Generate verification ID and code (PHP 스타일)
      const verificationId = this.generateVerificationId();
      const verificationCode = this.generateVerificationCode();

      // Store verification code with expiration (30 minutes)
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 30);

      // 데이터베이스에 인증 정보 저장
      const verification = this.emailVerificationRepository.create({
        verificationId,
        email,
        code: verificationCode,
        purpose,
        expiresAt,
        isVerified: false,
        isUsed: false,
      });

      await this.emailVerificationRepository.save(verification);
      this.logger.log(
        `Verification record created for email: ${email} with ID: ${verificationId}`,
      );

      // Reset attempt count
      this.attemptCounts.set(verificationId, 0);

      // Create verification link
      const verificationPath = await this.getFrontendSetting('frontend_email_verification_path', '/en/verify-email');
      const frontendUrl = await this.buildFrontendUrl(verificationPath);
      const verificationLink = `${frontendUrl}?id=${verificationId}&code=${verificationCode}`;

      // 템플릿 로드 및 데이터 적용
      const htmlTemplate = this.loadEmailTemplate(
        'verification-email.template.html',
      );

      const templateData = {
        verificationLink,
        verificationCode,
      };

      const htmlContent = this.applyTemplateData(htmlTemplate, templateData);

      // 이메일 발송 시도 (PHP 스타일)
      this.logger.log(
        `Attempting to send verification email to: ${email} for purpose: ${purpose}`,
      );
      const emailSent = await this.sendEmail(
        email,
        'Email Verification',
        htmlContent
      );

      if (!emailSent) {
        this.logger.warn(
          `Email sending failed but verification record was created for: ${email}`,
        );
        return verificationId;
      }

      this.logger.log(
        `Verification email sent successfully to: ${email} for purpose: ${purpose}`,
      );

      return verificationId;
    } catch (error) {
      this.logger.error(
        `Failed to send verification email to ${email}: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to send verification email: ${error.message}`);
    }
  }

  /**
   * Get verification status by ID
   * @param verificationId Verification ID
   * @returns Verification record or null if not found
   */
  async getVerificationStatus(
    verificationId: string,
  ): Promise<EmailVerification | null> {
    try {
      const verification = await this.emailVerificationRepository.findOne({
        where: { verificationId },
      });

      return verification;
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(
        `Failed to get verification status: ${err.message}`,
        err.stack,
      );
      return null;
    }
  }

  /**
   * Verify email using verification ID and code
   * @param verificationId Verification ID
   * @param code Verification code
   * @returns Verification status
   */
  async verifyEmail(
    verificationId: string,
    code: string,
  ): Promise<{ email: string }> {
    try {
      // 데이터베이스에서 인증 정보 조회
      const verification = await this.emailVerificationRepository.findOne({
        where: { verificationId },
      });

      // 인증 ID가 존재하지 않는 경우
      if (!verification) {
        throw new Error('Invalid verification ID');
      }

      // 이미 인증된 경우
      if (verification.isVerified) {
        throw new Error('Email already verified');
      }

      // 이미 사용된 경우
      if (verification.isUsed) {
        throw new Error('Verification code has already been used');
      }

      // 만료 여부 확인
      if (new Date() > verification.expiresAt) {
        throw new Error('Verification code has expired');
      }

      // 시도 횟수 확인
      const attempts = this.attemptCounts.get(verificationId) || 0;
      if (attempts >= this.maxAttempts) {
        this.attemptCounts.delete(verificationId);
        throw new Error('Maximum verification attempts exceeded');
      }

      // 시도 횟수 증가
      this.attemptCounts.set(verificationId, attempts + 1);

      // 코드 일치 여부 확인
      if (verification.code !== code) {
        throw new Error('Invalid verification code');
      }

      // 인증 성공, 상태 업데이트
      verification.isVerified = true;
      await this.emailVerificationRepository.save(verification);
      this.attemptCounts.delete(verificationId);
      return { email: verification.email };
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`Failed to verify email: ${err.message}`, err.stack);
      throw new Error(`Verification failed: ${err.message}`);
    }
  }

  /**
   * Send a general email using PHPMailer-style configuration
   * @param to Recipient email address
   * @param subject Email subject
   * @param htmlBody HTML email body
   * @param textBody Plain text email body
   * @returns Success status
   */
  async sendEmail(
    to: string,
    subject: string,
    htmlBody: string,
    textBody?: string,
  ): Promise<boolean> {
    try {
      // PHPMailer-style configuration from environment variables
      const smtpHost = this.configService.get<string>('SMTP_HOST') || 'previewme.xyz';
      const smtpPort = Number(this.configService.get<string>('SMTP_PORT') || '587');
      const smtpUsername = this.configService.get<string>('SMTP_USERNAME');
      const smtpPassword = this.configService.get<string>('SMTP_PASSWORD');
      const smtpSecure = (this.configService.get<string>('SMTP_SECURE') || 'tls').toLowerCase(); // 'ssl' | 'tls'
      const smtpAuthMethod = this.configService.get<string>('SMTP_AUTH_METHOD'); // e.g. 'LOGIN' | 'PLAIN'
      const fromEmail = this.configService.get<string>('FROM_EMAIL');
      const fromName = this.configService.get<string>('FROM_NAME');

      // 로깅 (PHP 스타일)
      this.logger.log(`SMTP Host: ${smtpHost}`);
      this.logger.log(`SMTP Port: ${smtpPort}`);
      this.logger.log(`SMTP Username: ${smtpUsername ? smtpUsername.substring(0, 5) + '...' + smtpUsername.substring(smtpUsername.length - 5) : 'not set'}`);
      this.logger.log(`SMTP Password: ${smtpPassword ? '******' : 'not set'}`);
      this.logger.log(`From Email: ${fromEmail}`);
      this.logger.log(`From Name: ${fromName}`);

      // nodemailer를 사용한 이메일 전송 (PHPMailer 스타일)
      const nodemailer = require('nodemailer');

      // SMTP 설정 (PHP PHPMailer 스타일)
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpSecure === 'ssl' || smtpPort === 465,
        requireTLS: smtpSecure === 'tls',
        auth: {
          user: smtpUsername,
          pass: smtpPassword,
        },
        ...(smtpAuthMethod ? { authMethod: smtpAuthMethod } as any : {}),
        tls: {
          rejectUnauthorized: false
        }
      });

      // 이메일 옵션 (PHP 스타일)
      const mailOptions = {
        from: `"${fromName}" <${fromEmail}>`,
        to: to,
        subject: subject,
        html: htmlBody,
        text: textBody || htmlBody.replace(/<[^>]*>/g, ''), // HTML 태그 제거
      };

      // 이메일 전송 파라미터 로깅 (PHP 스타일)
      this.logger.log(
        `Email params: ${JSON.stringify({
          from: mailOptions.from,
          to: mailOptions.to,
          subject: mailOptions.subject,
        })}`,
      );

      this.logger.log(
        `Attempting to send email to: ${to} with subject: ${subject}`,
      );

      const info = await transporter.sendMail(mailOptions);
      this.logger.log(`Email sent successfully to: ${to}`);
      this.logger.log(`Message ID: ${info.messageId}`);
      return true;
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(
        `Failed to send email to ${to}: ${err.message}`,
        err.stack,
      );

      // 자세한 오류 정보 로깅 (PHP 스타일)
      this.logger.error(`Error details: ${JSON.stringify(error, null, 2)}`);

      return false;
    }
  }

  /**
   * 고유한 인증 ID 생성 (PHP 스타일)
   * @returns 생성된 인증 ID
   */
  private generateVerificationId(): string {
    return `v-${Date.now()}-${randomBytes(6).toString('hex')}`;
  }

  /**
   * 6자리 인증 코드 생성 (PHP 스타일)
   * @returns 6자리 인증 코드
   */
  private generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Clean up expired verification codes
   * This method should be called periodically
   */
  async cleanupExpiredCodes(): Promise<void> {
    try {
      const now = new Date();
      
      // 만료된 인증 코드 삭제
      await this.emailVerificationRepository
        .createQueryBuilder()
        .delete()
        .where('expiresAt < :now', { now })
        .andWhere('isVerified = :isVerified', { isVerified: false })
        .execute();
      
      // 메모리 맵에서도 만료된 시도 횟수 정보 삭제
      for (const [id, count] of this.attemptCounts.entries()) {
        const verification = await this.emailVerificationRepository.findOne({
          where: { verificationId: id },
        });
        
        if (!verification || now > verification.expiresAt) {
          this.attemptCounts.delete(id);
        }
      }
      
      this.logger.log('Expired verification codes cleaned up');
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(
        `Failed to clean up expired codes: ${err.message}`,
        err.stack,
      );
    }
  }
}
