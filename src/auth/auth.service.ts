import { Injectable, UnauthorizedException, BadRequestException, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { EmailService } from '../common/services/email.service';
import { EmailVerification } from '../entities/email-verification.entity';
import { User, StripeOnboardingStatus } from '../entities/user.entity';
import { UserUpdatesService } from '../user-updates/user-updates.service';
import { DeckService } from '../deck/deck.service';
import { SourceType } from '../entities/deck.entity';
import { UserRole, UserStatus } from '../common/enums/user-role.enum';
import { ReferrerRegisterDto, CandidateRegisterDto, LoginDto } from './dto/auth.dto';
import { ApiResponse } from '../common/interfaces/api-response.interface';
import { Deck } from '../entities/deck.entity';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
    private dataSource: DataSource,
    private userUpdateService: UserUpdatesService,
    private deckService: DeckService,
  ) {}

  async validateUser(email: string, password: string, role: UserRole): Promise<any> {
    const user = await this.usersService.findByEmailAndRole(email, role);
    if (!user) {
      return null;
    }

    let passwordToCheck = user.password;

    if (passwordToCheck && (await bcrypt.compare(password, passwordToCheck))) {
      const { password: _, ...result } = user;
      return result;
    }
    return null;
  }

  async login(loginDto: LoginDto): Promise<ApiResponse<{ accessToken: string; refreshToken: string; user: any }>> {
    const { email, password, role } = loginDto;

    // 사용자 찾기 (이메일과 역할 모두 확인)
    const user = await this.usersService.findByEmailAndRole(email, role);
    if (!user) {
      throw new BadRequestException(`User not found with email '${email}' and role '${role}'`);
    }

    // 사용자 상태 검사 - ACTIVE 상태여야만 로그인 가능
    if (user.status !== UserStatus.ACTIVE) {
      if (user.status === UserStatus.PENDING) {
        throw new BadRequestException('Your account is pending approval. Please wait for admin approval.');
      } else if (user.status === UserStatus.SUSPENDED) {
        throw new BadRequestException('Your account has been suspended. Please contact support.');
      } else {
        throw new BadRequestException('Your account is inactive. Please contact support.');
      }
    }

    // 비밀번호 확인
    if (!user.password || !(await bcrypt.compare(password, user.password))) {
      throw new BadRequestException('Invalid password');
    }

    // JWT payload 생성 (선택된 역할만 포함)
    const payload = {
      sub: user.id,
      email: user.email,
      role: role, // 선택된 역할만
      referrerSubscriptionStatus: user.role === UserRole.REFERRER ? (user.subscriptionPurchased ? 'active' : 'free') : null,
      candidateSubscriptionStatus: user.role === UserRole.CANDIDATE ? (user.subscriptionPurchased ? 'active' : 'free') : null,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN', '30d'),
    });

    // Update last login time
    await this.usersService.update(user.id, { lastLoginAt: new Date() });

    // Save refresh token to database for security
    await this.usersService.updateRefreshToken(user.id, refreshToken);

    return {
      success: true,
      data: {
        accessToken: accessToken,
        refreshToken: refreshToken,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: role, // 선택된 역할만
          roles: [role], // 선택된 역할만 배열로
          status: user.status,
          referrerSubscriptionStatus: user.role === UserRole.REFERRER ? (user.subscriptionPurchased ? 'active' : 'free') : null,
          candidateSubscriptionStatus: user.role === UserRole.CANDIDATE ? (user.subscriptionPurchased ? 'active' : 'free') : null,
          emailVerified: user.emailVerified,
        },
      },
    };
  }

  async registerReferrer(registerDto: ReferrerRegisterDto): Promise<ApiResponse<any>> {
    // 트랜잭션으로 모든 작업을 처리
    const result = await this.dataSource.transaction(async (manager) => {
      try {


        // Check if user already exists with this email and role
        const existingUser = await manager.findOne(User, { 
          where: { 
            email: registerDto.email,
            role: UserRole.REFERRER
          } 
        });

        if (existingUser) {
          throw new BadRequestException('User already exists with this email and role');
        }

        // Verify email verification
        const emailVerification = await manager.findOne(EmailVerification, {
          where: { 
            verificationId: registerDto.verificationId, 
            email: registerDto.email, 
            isVerified: true 
          }
        });
        if (!emailVerification) {
          throw new BadRequestException('Email verification required.');
        }

        // Get default referrer plan
        const defaultPlan = await manager.findOne('subscription_plans', {
          where: { 
            isDefault: true, 
            targetRole: UserRole.REFERRER 
          }
        }) as any;

        if (!defaultPlan) {
          throw new BadRequestException('Default referrer plan not found');
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(
          registerDto.password,
          parseInt(this.configService.get('BCRYPT_ROUNDS', '12')),
        );

        // Create new user with referrer-specific fields
        const userData = {
          ...registerDto,
          role: UserRole.REFERRER,
          password: hashedPassword,
          status: UserStatus.PENDING, // Referrers need approval
          emailVerified: true, // Mark as verified
          stripeOnboardingStatus: StripeOnboardingStatus.NOT_STARTED,
          currentPlanCode: defaultPlan.code, // default 플랜 설정
          candidateCap: defaultPlan.acquiredCandidateCap, // candidateCap 설정
        };
        const user = await manager.save(User, userData);

        return { user };
      } catch (error) {
        // 트랜잭션 내에서 에러가 발생하면 자동으로 롤백됨
        this.logger.error(`Error in referrer registration transaction: ${error.message}`);
        throw error;
      }
    });

    // JWT token generation
    const payload = { email: result.user.email, sub: result.user.id, role: UserRole.REFERRER };
    const accessToken = this.jwtService.sign(payload);

    return {
      success: true,
      data: {
        accessToken: accessToken,
        user: {
          id: result.user.id,
          email: result.user.email,
          firstName: result.user.firstName,
          lastName: result.user.lastName,
          role: result.user.role,
          status: result.user.status,
          emailVerified: result.user.emailVerified,
        },
      },
    };
  }

  /**
   * Candidate 회원가입
   */
  async registerCandidate(
    candidateRegisterDto: CandidateRegisterDto,
  ): Promise<ApiResponse<{ token: string; user: any }>> {
    const { email, firstName, lastName, password, referredBy, verificationId } = candidateRegisterDto;

    // 트랜잭션으로 모든 작업을 처리
    const result = await this.dataSource.transaction(async (manager) => {
      try {
        // 이메일 인증 확인
        const emailVerification = await manager.findOne(EmailVerification, { 
          where: { verificationId } 
        });

        if (!emailVerification || emailVerification.isUsed) {
          throw new UnauthorizedException('Invalid or already used verification ID');
        }

        // 기존 사용자 확인
        const existingUser = await manager.findOne(User, { 
          where: { email, role: UserRole.CANDIDATE } 
        });

        // 추천인 확인 (ID와 역할 모두 확인)
        const referrer = await manager.findOne(User, { 
          where: { 
            id: referredBy,
            role: UserRole.REFERRER
          } 
        });
        if (!referrer) {
          throw new NotFoundException('Referrer not found or user is not a referrer');
        }

        // 사용자 생성 또는 업데이트 (candidate-specific fields 포함)
        let user: User;
        if (existingUser) {
          throw new BadRequestException('User already exists');
        } else {
          // 새 사용자 생성
          const hashedPassword = await bcrypt.hash(password, parseInt(this.configService.get('BCRYPT_ROUNDS', '12')));
          user = manager.create(User, {
            email,
            firstName,
            lastName,
            role: UserRole.CANDIDATE,
            status: UserStatus.ACTIVE,
            password: hashedPassword,
            emailVerified: true,
            referredBy, // candidate-specific field
            currentPlanCode: 'STANDARD', // 기본 플랜 설정
          });
          user = await manager.save(user);
        }

        // deck 테이블에 INVITE 타입으로 기록
        this.logger.log(`Creating deck: referrerId=${referrer.id}, candidateId=${user.id}, referrerEmail=${referrer.email}, candidateEmail=${user.email}`);
        
        const existingDeck = await manager.findOne(Deck, {
          where: { 
            referrerId: referrer.id, 
            candidateId: user.id 
          }
        });
        
        if (!existingDeck) {
          const deck = manager.create(Deck, {
            referrerId: referrer.id,
            candidateId: user.id,
            source: SourceType.INVITE,
          });
          await manager.save(deck);
          this.logger.log(`Deck created successfully: ${deck.id}`);
        } else {
          this.logger.log(`Deck already exists, skipping creation`);
        }

        // 이메일 인증 사용 처리
        emailVerification.isUsed = true;
        await manager.save(emailVerification);

        return { user };
      } catch (error) {
        // 트랜잭션 내에서 에러가 발생하면 자동으로 롤백됨
        this.logger.error(`Error in candidate registration transaction: ${error.message}`);
        throw error;
      }
    });

    // JWT 토큰 생성
    const token = this.jwtService.sign({
      sub: result.user.id,
      email: result.user.email,
      role: UserRole.CANDIDATE, // 로그인 시 사용하는 역할
    });

    // candidate 가입 활동 로그 생성
    await this.userUpdateService.logCandidateRegistration(result.user.id, referredBy);

    return {
        success: true,
        data: {
          token,
          user: {
            id: result.user.id,
            email: result.user.email,
            firstName: result.user.firstName,
            lastName: result.user.lastName,
            role: UserRole.CANDIDATE, // 명시적으로 CANDIDATE 역할 설정
            status: result.user.status,
            emailVerified: result.user.emailVerified,
          },
        },
      };
  }

  /**
   * 사용자 로그아웃 처리
   * @param userId 사용자 ID
   * @param refreshToken 리프레시 토큰 (선택사항)
   */
  async logout(userId: string, refreshToken?: string): Promise<ApiResponse<any>> {
    try {
      // DB에서 refresh 토큰 제거
      await this.usersService.updateRefreshToken(userId, null);
      
      this.logger.log(`User ${userId} logged out successfully`);
      
      return {
        success: true,
        data: {
          message: 'Logged out successfully'
        }
      };
    } catch (error) {
      this.logger.error(`Error during logout for user ${userId}:`, error);
      throw new UnauthorizedException('Logout failed');
    }
  }

  /**
   * 리프레시 토큰을 사용하여 새 액세스 토큰과 리프레시 토큰을 발급
   * @param refreshToken 리프레시 토큰
   * @returns 새로운 인증 토큰과 사용자 정보
   */
  async refreshToken(refreshToken: string): Promise<ApiResponse<any>> {
    try {
      // 1. 리프레시 토큰 자체의 유효성 검증 (만료 여부, 시그니처 등)
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
      });

      // 2. DB에서 사용자 조회
      const user = await this.usersService.findById(payload.sub);
      if (!user || !user.isActive()) {
        throw new UnauthorizedException('User not found or inactive.');
      }

      // 3. DB에 저장된 토큰과 일치하는지 확인
      if (user.refreshToken !== refreshToken) {
        // DB의 토큰과 일치하지 않으면, 탈취되었을 가능성이 있으므로 로그아웃 처리
        await this.logout(user.id, null); // 기존 토큰 무효화
        throw new UnauthorizedException('Invalid refresh token. Please log in again.');
      }

      // 4. 사용자의 역할을 사용 (JWT는 단일 역할만 지원)
      const primaryRole = user.role || UserRole.CANDIDATE;
      
      // 5. 새로운 토큰 생성
      const newAccessToken = this.jwtService.sign(
        { email: user.email, sub: user.id, role: primaryRole },
        { secret: this.configService.get('JWT_SECRET'), expiresIn: '15m' }
      );

      const newRefreshToken = this.jwtService.sign(
        { email: user.email, sub: user.id, role: primaryRole },
        { secret: this.configService.get('JWT_REFRESH_SECRET'), expiresIn: '7d' }
      );

      // 6. 새로 생성된 리프레시 토큰을 DB에 저장
      await this.usersService.updateRefreshToken(user.id, newRefreshToken);

      return {
        success: true,
        data: {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
        },
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid refresh token.');
    }
  }

  async forgotPassword(email: string, role: UserRole): Promise<ApiResponse<any>> {
    const user = await this.usersService.findByEmailAndRole(email, role);
    if (!user) {
      // For security reasons, return success even if user doesn't exist
      return { 
        success: true, 
        data: { message: 'Password reset email sent.' } 
      };
    }

    // Generate password reset token
    const resetToken = this.generateRandomToken();
    const resetExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Update user with reset token
    const updateData: any = {
      passwordResetToken: resetToken,
      passwordResetExpires: resetExpires
    };

    await this.usersService.update(user.id, updateData);

    // Send password reset email
    try {
      const emailSent = await this.emailService.sendPasswordResetEmail(email, resetToken);
      
      if (emailSent) {
        this.logger.log(`Password reset email sent successfully to: ${email} for role: ${role}`);
        return { 
          success: true, 
          data: { message: 'Password reset email sent successfully.' } 
        };
      } else {
        this.logger.warn(`Failed to send password reset email to: ${email}`);
        return { 
          success: false, 
          data: { message: 'Failed to send password reset email. Please try again.' } 
        };
      }
    } catch (error) {
      this.logger.error(`Error sending password reset email: ${error.message}`);
      return { 
        success: false, 
        data: { message: 'Failed to send password reset email. Please try again.' } 
      };
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<ApiResponse<any>> {
    try {
      // Find user by either reset token and determine role automatically
      const user = await this.usersService.findByResetToken(token);
      if (!user) {
        throw new BadRequestException('Invalid reset token.');
      }

      // Determine role and check if token is expired
      const role = user.role;
      const isExpired = !user.passwordResetExpires || user.passwordResetExpires < new Date();

      if (isExpired) {
        throw new BadRequestException('Reset token has expired.');
      }



      // Update password and clear reset token
      const updateData: any = {
        password: await bcrypt.hash(
          newPassword,
          parseInt(this.configService.get('BCRYPT_ROUNDS', '12')),
        ),
        passwordResetToken: null,
        passwordResetExpires: null
      };

      await this.usersService.update(user.id, updateData);

      this.logger.log(`Password reset successfully for user: ${user.email} with role: ${role}`);

      return { 
        success: true, 
        data: { message: 'Password changed successfully.' } 
      };
    } catch (error) {
      this.logger.error(`Password reset failed: ${error.message}`);
      throw error;
    }
  }

  private generateRandomToken(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i <32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }


  /**
   * Send email verification code
   * @param email Email address
   * @returns Verification result information
   */
  async sendVerificationEmail(email: string): Promise<ApiResponse<any>> {
    try {
      // Email format validation is handled by DTO
      // No need to check existing users here - verification should be sent before registration
      
      // Send verification code
      const verificationId = await this.emailService.sendVerificationEmail(email);

      this.logger.log(`Verification email sent to: ${email}`);
      return {
        success: true,
        data: { verificationId }
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Email verification code sending failed: ${errorMessage}`,
      );
      throw error;
    }
  }

  /**
   * Verify email verification code
   * @param verificationId Verification ID
   * @param code Verification code
   * @returns Verification result information
   */
  async verifyEmail(verificationId: string, code: string): Promise<ApiResponse<any>> {
    try {
      const result = await this.emailService.verifyEmail(verificationId, code);
      return {
        success: true,
        data: result
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Email verification failed: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Generate referral link for referrer
   * @param referrerId Referrer ID
   * @returns Generated referral link information
   */
  async generateReferralLink(referrerId: string) {
    // 추천인 사용자 정보 확인
    const user = await this.usersService.findById(referrerId);
    if (!user || user.role !== UserRole.REFERRER) {
      throw new NotFoundException(`User is not a valid referrer`);
    }

    // 추천인 계정이 활성화되어 있는지 확인
    if (user.status !== UserStatus.ACTIVE) {
      throw new BadRequestException(`Referrer account is not active. Current status: ${user.status}`);
    }

    return {
      referrerId,
    };
  }

  /**
   * Verify referral link
   * @param referrerId Referrer ID
   * @returns Referrer information
   */
  async verifyReferralLink(referrerId: string) {
    // UUID 형식 검증
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(referrerId)) {
      throw new BadRequestException('Invalid referral ID format.');
    }

    // 추천인 사용자 정보 확인
    const user = await this.usersService.findById(referrerId);
    if (!user || user.role !== UserRole.REFERRER) {
      throw new NotFoundException('Referral ID not found or user is not a referrer.');
    }

    // 추천인 계정이 활성화되어 있는지 확인
    if (user.status !== UserStatus.ACTIVE) {
      throw new NotFoundException('Referral ID not found or referrer is not active.');
    }

    return {
      referrerId: user.id,
      referrerName: `${user.firstName} ${user.lastName}`,
      isValid: true,
    };
  }
}
