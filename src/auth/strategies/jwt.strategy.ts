import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';
import { UserRole } from '@/common/enums/user-role.enum';


@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    try {
      // 사용자 정보를 데이터베이스에서 가져와서 최신 상태 확인
      const user = await this.usersService.findById(payload.sub);
      
      if (!user || !user.isActive()) {
        throw new UnauthorizedException('User not found or inactive.');
      }

      // 선택된 역할이 사용자의 역할과 일치하는지 확인
      if (user.role !== payload.role) {
        throw new UnauthorizedException('User does not have this role.');
      }

      // JWT payload with selected role information
      return {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        stripeAccountId: user.stripeAccountId ?? null,
        stripeOnboardingStatus: user.stripeOnboardingStatus ?? null,
        role: payload.role, // 선택된 역할만
        status: user.status,
        emailVerified: user.emailVerified,
        lastLoginAt: user.lastLoginAt,
        referredBy: user.referredBy,
        currentPlanCode: user.currentPlanCode,
        subscriptionPurchased: user.subscriptionPurchased,
        subscriptionStartDate: user.subscriptionStartDate,
        subscriptionEndDate: user.subscriptionEndDate,
        nextBillingDate: user.nextBillingDate,
        subscriptionInterval: user.subscriptionInterval,
        candidateCap: user.candidateCap,
        purchasedCandidates: user.purchasedCandidates,
        balance: user.balance,
        referrerSubscriptionStatus: user.role === UserRole.REFERRER ? (user.subscriptionPurchased ? 'active' : 'free') : null,
        candidateSubscriptionStatus: user.role === UserRole.CANDIDATE ? (user.subscriptionPurchased ? 'active' : 'free') : null,
        hasRole: (role: string) => role === payload.role, // 선택된 역할만 체크
        isReferrer: () => payload.role === UserRole.REFERRER,
        isCandidate: () => payload.role === UserRole.CANDIDATE,
        isActive: () => user.status === 'active',
        isPending: () => user.status === 'pending',
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid token.');
    }
  }
}
