import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Get,
  Param,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '../common/decorators/throttle.decorator';
import { AuthService } from './auth.service';
import {
  LoginDto,
  ReferrerRegisterDto,
  CandidateRegisterDto,
  RefreshTokenDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  VerifyEmailDto,
  SendReferrerEmailVerificationDto,
  VerifyReferrerEmailDto,
} from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { ApiResponse as ApiResponseInterface } from '../common/interfaces/api-response.interface';
import { UserRole } from '../common/enums/user-role.enum';
import { CurrentUser as CurrentUserType } from './types/current-user.type';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 400, description: 'Authentication failed' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('register/referrer')
  @ApiOperation({ summary: 'Referrer registration' })
  @ApiResponse({ status: 201, description: 'Referrer registration successful' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async registerReferrer(@Body() registerDto: ReferrerRegisterDto) {
    return this.authService.registerReferrer(registerDto);
  }

  @Post('register/candidate')
  @ApiOperation({ summary: 'Candidate registration' })
  @ApiResponse({ status: 201, description: 'Candidate registration successful' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async registerCandidate(@Body() registerDto: CandidateRegisterDto) {
    return this.authService.registerCandidate(registerDto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Token refresh' })
  @ApiResponse({ status: 200, description: 'Token refresh successful' })
  @ApiResponse({ status: 401, description: 'Token refresh failed' })
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshToken(refreshTokenDto.refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User logout' })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async logout(@CurrentUser() user: CurrentUserType) {
    return this.authService.logout(user.id);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Forgot password' })
  @ApiResponse({ status: 200, description: 'Password reset email sent' })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto.email, forgotPasswordDto.role);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password' })
  @ApiResponse({ status: 200, description: 'Password reset successful' })
  @ApiResponse({ status: 400, description: 'Invalid token' })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(
      resetPasswordDto.token,
      resetPasswordDto.newPassword,
    );
  }
  
  @Post('email/send-verification')
  @Throttle(3, 60) // Allow up to 3 email sends per minute
  @ApiOperation({
    summary: 'Send email verification code',
    description: 'Send a verification code to the provided email address',
  })
  @ApiResponse({ status: 200, description: 'Verification email sent successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async sendVerificationEmail(
    @Body() sendEmailVerificationDto: SendReferrerEmailVerificationDto,
  ): Promise<ApiResponseInterface<any>> {
    const result = await this.authService.sendVerificationEmail(
      sendEmailVerificationDto.email,
    );
    return result;
  }

  @Post('email/verify')
  @Throttle(10, 60) // Allow up to 10 email verifications per minute
  @ApiOperation({
    summary: 'Verify email',
    description: 'Verify the email verification code',
  })
  @ApiResponse({ status: 200, description: 'Email verification successful' })
  @ApiResponse({ status: 400, description: 'Invalid request or invalid verification code' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async verifyEmail(@Body() verifyEmailDto: VerifyReferrerEmailDto): Promise<ApiResponseInterface<any>> {
    const result = await this.authService.verifyEmail(
      verifyEmailDto.verificationId,
      verifyEmailDto.code,
    );
    return result;
  }

  @Post('referral-link')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Generate referral link', 
    description: 'Generate a referral identifier for the authenticated referrer.' 
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Referral id successfully generated.',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            referrerId: { type: 'string' }
          }
        }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Referrer account is not active.' })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required.' })
  @ApiResponse({ status: 403, description: 'Forbidden - User is not a referrer.' })
  @ApiResponse({ status: 404, description: 'Referrer not found.' })
  async generateReferralLink(@CurrentUser() user: CurrentUserType): Promise<ApiResponseInterface<any>> {
    // 추천인만 접근 가능
    if (user.role !== UserRole.REFERRER) {
      throw new ForbiddenException('Only referrers can generate referral links');
    }

    const result = await this.authService.generateReferralLink(user.id);
    return { success: true, data: result };
  }

  @Get('referral-link/verify/:referrerId')
  @ApiOperation({ 
    summary: 'Verify referral link', 
    description: 'Verify if a referral ID is valid and return referrer information.' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Referral ID is valid.',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            referrerId: { type: 'string' },
            referrerName: { type: 'string' },
            isValid: { type: 'boolean' }
          }
        }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Invalid referral ID format.' })
  @ApiResponse({ status: 404, description: 'Referral ID not found or referrer is not active.' })
  async verifyReferralLink(@Param('referrerId') referrerId: string): Promise<ApiResponseInterface<any>> {
    const result = await this.authService.verifyReferralLink(referrerId);
    return { success: true, data: result };
  }


  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user info' })
  @ApiResponse({ status: 200, description: 'User info retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Authentication required' })
  async getMe(@CurrentUser() user: CurrentUserType) {
    // 민감정보 제외하고 필요한 정보만 리턴
    const { 
      password, 
      passwordResetToken, 
      passwordResetExpires,
      ...safeUserData 
    } = user;
    
    // candidateCap과 purchasedCandidates는 포함 (referrer에게 중요한 정보)
    return { 
      success: true, 
      data: {
        ...safeUserData,
        stripeAccountId: (user as any).stripeAccountId ?? null,
        stripeOnboardingStatus: (user as any).stripeOnboardingStatus ?? null,
      }
    };
  }
}
