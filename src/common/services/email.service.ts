import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  SESClient,
  SendEmailCommand,
  SendEmailCommandInput,
} from '@aws-sdk/client-ses';
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
 * Service for sending emails using AWS SES
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly sesClient: SESClient;
  private readonly maxAttempts = 3;
  private readonly attemptCounts: Map<string, number> = new Map();

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(EmailVerification)
    private readonly emailVerificationRepository: Repository<EmailVerification>,
    @InjectRepository(Settings)
    private readonly settingsRepository: Repository<Settings>,
  ) {
    // Initialize AWS SES client
    const region = this.configService.get<string>('AWS_REGION') || 'us-east-1';
    const accessKeyId =
      this.configService.get<string>('AWS_ACCESS_KEY_ID') || '';
    const secretAccessKey =
      this.configService.get<string>('AWS_SECRET_ACCESS_KEY') || '';

    // 자격 증명 로깅 (보안상 일부만 표시)
    this.logger.log(`AWS Region: ${region}`);
    this.logger.log(
      `AWS Access Key ID: ${accessKeyId ? accessKeyId.substring(0, 5) + '...' + accessKeyId.substring(accessKeyId.length - 5) : 'not set'}`,
    );
    this.logger.log(
      `AWS Secret Access Key: ${secretAccessKey ? '******' : 'not set'}`,
    );

    this.sesClient = new SESClient({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    // SES 클라이언트 초기화 확인
    this.logger.log('SES client initialized');
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
    const baseUrl = await this.getFrontendSetting('frontend_base_url', 'https://previewme.xyz');
    return `${baseUrl}${path}`;
  }

  /**
   * 이메일 템플릿 로드
   * @param templateName 템플릿 파일 이름
   * @returns 템플릿 내용
   */
  private loadEmailTemplate(templateName: string): string {
    // 탐색할 잠재 경로들 (존재하는 첫 번째 경로를 사용)
    const candidatePaths = [
      path.join(process.cwd(), 'dist', 'src', 'common', 'templates', 'email', templateName),
      path.join(__dirname, '..', 'templates', 'email', templateName),
      path.join(process.cwd(), 'src', 'common', 'templates', 'email', templateName),
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

    // 템플릿 파일이 없을 경우 기본 인라인 템플릿 사용
    this.logger.warn(`Email template not found; using default inline template: ${templateName}`);
    const defaultTemplate = `
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
    return defaultTemplate;
  }

  /**
   * 비밀번호 재설정 이메일 발송
   * @param email 이메일 주소
   * @param resetToken 비밀번호 재설정 토큰
   * @returns 발송 성공 여부
   */
  async sendPasswordResetEmail(email: string, resetToken: string): Promise<boolean> {
    try {
      const resetPath = await this.getFrontendSetting('frontend_reset_password_path', '/en/reset-password');
      const frontendUrl = await this.buildFrontendUrl(resetPath);
      const resetLink = `${frontendUrl}?token=${resetToken}`;

      // 비밀번호 재설정 이메일 템플릿
      const htmlContent = `
        <html>
          <body>
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #1f2937; margin-bottom: 24px;">Hello,</h2>
              <p style="color: #374151; line-height: 1.6; margin-bottom: 20px;">
                You requested a password reset. Please click the link below to create a new password:
              </p>
              <div style="margin: 30px 0;">
                <a href="${resetLink}" 
                   style="display: inline-block; background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">
                  Reset Password
                </a>
              </div>
              <p style="color: #6b7280; font-size: 14px; line-height: 1.5; margin-bottom: 20px;">
                If you did not request this, please ignore this email.
              </p>
              <p style="color: #6b7280; font-size: 14px; line-height: 1.5; margin-bottom: 20px;">
                This link will expire in 24 hours.
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

      // 이메일 발송
      const emailSent = await this.sendEmail(
        email,
        'Password Reset Request',
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
   * 템플릿에 데이터 적용
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
   * Send verification email with a verification link
   * @param email Email address to send verification to
   * @param purpose Verification purpose
   * @returns Verification result
   */
  async sendVerificationEmail(
    email: string,
    purpose: EmailVerificationPurpose = EmailVerificationPurpose.REGISTER,
  ): Promise<string> {
    try {
      // Generate verification ID and code
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

      // 이메일 발송 시도
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
   * Send a general email
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
      // 환경 변수 확인
      const emailFrom = this.configService.get<string>('SES_SENDER_EMAIL');
      if (!emailFrom) {
        this.logger.warn(
          'SES_SENDER_EMAIL is not set in environment variables. Using default value.',
        );
      }

      // AWS 자격 증명 확인
      const awsRegion = this.configService.get<string>('AWS_REGION');
      const awsAccessKeyId =
        this.configService.get<string>('AWS_ACCESS_KEY_ID');
      const awsSecretAccessKey = this.configService.get<string>(
        'AWS_SECRET_ACCESS_KEY',
      );

      // 자세한 환경 변수 로깅
      this.logger.log(
        `SES_SENDER_EMAIL: ${emailFrom || 'not set (using default)'}`,
      );
      this.logger.log(`AWS_REGION: ${awsRegion || 'not set'}`);
      this.logger.log(
        `AWS_ACCESS_KEY_ID: ${awsAccessKeyId ? awsAccessKeyId.substring(0, 5) + '...' + awsAccessKeyId.substring(awsAccessKeyId.length - 5) : 'not set'}`,
      );
      this.logger.log(
        `AWS_SECRET_ACCESS_KEY: ${awsSecretAccessKey ? '******' : 'not set'}`,
      );

      if (!awsRegion || !awsAccessKeyId || !awsSecretAccessKey) {
        this.logger.warn(
          'AWS credentials are not properly set in environment variables.',
        );
      }

      const params: SendEmailCommandInput = {
        Source: emailFrom || 'info@algorith.capital',
        Destination: {
          ToAddresses: [to],
        },
        Message: {
          Subject: {
            Data: subject,
            Charset: 'UTF-8',
          },
          Body: {
            Html: {
              Data: htmlBody,
              Charset: 'UTF-8',
            },
            ...(textBody
              ? {
                  Text: {
                    Data: textBody,
                    Charset: 'UTF-8',
                  },
                }
              : {}),
          },
        },
      };

      // 이메일 전송 파라미터 로깅
      this.logger.log(
        `Email params: ${JSON.stringify({
          Source: params.Source,
          Destination: params.Destination,
          Subject: params.Message.Subject.Data,
        })}`,
      );

      this.logger.log(
        `Attempting to send email to: ${to} with subject: ${subject}`,
      );
      const command = new SendEmailCommand(params);
      await this.sesClient.send(command);
      this.logger.log(`Email sent successfully to: ${to}`);
      return true;
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(
        `Failed to send email to ${to}: ${err.message}`,
        err.stack,
      );

      // 자세한 오류 정보 로깅
      const awsError = error as { name?: string; code?: string };
      this.logger.error(`Error type: ${awsError.name || 'Unknown'}`);
      this.logger.error(`Error code: ${awsError.code || 'N/A'}`);
      this.logger.error(`Error details: ${JSON.stringify(error, null, 2)}`);

      if (awsError.name === 'CredentialsProviderError') {
        this.logger.error(
          'AWS credentials are invalid or not properly configured.',
        );
      } else if (awsError.name === 'MessageRejected') {
        this.logger.error(
          'Email message was rejected by AWS SES. Check if your email addresses are verified.',
        );
      } else if (awsError.name === 'ConfigurationSetDoesNotExist') {
        this.logger.error('AWS SES configuration set does not exist.');
      } else if (awsError.name === 'InvalidClientTokenId') {
        this.logger.error(
          'The AWS access key ID or security token included in the request is invalid. Check your AWS credentials.',
        );
      } else if (awsError.name === 'SignatureDoesNotMatch') {
        this.logger.error(
          'The request signature calculated does not match the signature provided. Check your AWS secret access key.',
        );
      } else if (awsError.name === 'InvalidParameterValue') {
        this.logger.error(
          'One of the parameters in your request is invalid. Check the email addresses.',
        );
      }

      return false;
    }
  }

  /**
   * 고유한 인증 ID 생성
   * @returns 생성된 인증 ID
   */
  private generateVerificationId(): string {
    return `v-${Date.now()}-${randomBytes(6).toString('hex')}`;
  }

  /**
   * 6자리 인증 코드 생성
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
