import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, IsNotEmpty, MinLength, IsOptional, IsArray, IsUUID, Length, IsEnum } from 'class-validator';
import { UserRole } from '../../common/enums/user-role.enum';

export class LoginDto {
  @ApiProperty({ description: '이메일' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: '비밀번호' })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty({ description: '사용자 역할', enum: UserRole })
  @IsNotEmpty()
  role: UserRole;
}

export class ReferrerRegisterDto {
  @ApiProperty({ description: '이메일' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: '사용자 이름' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ description: '사용자 성' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ description: '비밀번호' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({
    description: 'Email verification ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsString()
  @IsNotEmpty({ message: 'Email verification ID is required' })
  verificationId: string;
}

export class CandidateRegisterDto {
  @ApiProperty({ description: '이메일' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: '사용자 이름' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ description: '사용자 성' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ description: '비밀번호' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ description: 'Referrer ID (required for candidate registration)', required: true })
  @IsUUID('4', { message: 'Invalid referrer ID format' })
  @IsNotEmpty({ message: 'Referrer ID is required' })
  referredBy: string;

  @ApiProperty({ description: 'Email verification ID (required)', example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsString()
  @IsNotEmpty({ message: 'Email verification ID is required' })
  verificationId: string;
}

export class RefreshTokenDto {
  @ApiProperty({ description: '리프레시 토큰' })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ description: '이메일' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ 
    description: '사용자 역할 (후보자 또는 추천인)', 
    enum: UserRole,
    example: UserRole.CANDIDATE
  })
  @IsEnum(UserRole, { message: 'Role must be either CANDIDATE or REFERRER' })
  @IsNotEmpty({ message: 'Role is required' })
  role: UserRole;
}

export class ResetPasswordDto {
  @ApiProperty({ description: '비밀번호 재설정 토큰' })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({ description: '새 비밀번호' })
  @IsString()
  @MinLength(8)
  newPassword: string;
}

export class VerifyEmailDto {
  @ApiProperty({ description: '이메일 인증 토큰' })
  @IsString()
  @IsNotEmpty()
  token: string;
}


// 이메일 인증 코드 전송을 위한 DTO
export class SendReferrerEmailVerificationDto {
 @ApiProperty({
   example: 'referrer@example.com',
 })
 @IsEmail({}, { message: 'Please enter a valid email address' })
 @IsNotEmpty({ message: 'Email is required' })
 email: string;
}

// 이메일 인증 코드 확인을 위한 DTO
export class VerifyReferrerEmailDto {
 @ApiProperty({
   description: '인증 ID',
   example: '550e8400-e29b-41d4-a716-446655440000',
 })
 @IsString()
 @IsNotEmpty({ message: 'Verification ID is required' })
 verificationId: string;

 @ApiProperty({
   description: '인증 코드 (6자리)',
   example: '123456',
 })
 @IsString()
 @Length(6, 6, { message: 'Verification code must be 6 digits' })
 @IsNotEmpty({ message: 'Verification code is required' })
 code: string;
}
