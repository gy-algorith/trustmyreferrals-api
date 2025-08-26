import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ForbiddenException } from '@nestjs/common';

import { SUBSCRIPTION_KEY } from '../decorators/subscription.decorator';

@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredSubscription = this.reflector.getAllAndOverride<string[]>(SUBSCRIPTION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredSubscription) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    
    if (!user) {
      return false;
    }

    // 사용자가 필요한 구독 상태 중 하나라도 가지고 있는지 확인
    // 역할에 따라 적절한 구독 상태 확인
    const hasRequiredSubscription = requiredSubscription.some((subscription) => {
      if (user.isReferrer()) {
        return user.referrerSubscriptionStatus === subscription;
      } else if (user.isCandidate()) {
        return user.candidateSubscriptionStatus === subscription;
      }
      return false;
    });

    if (!hasRequiredSubscription) {
      throw new ForbiddenException(
        `이 기능을 사용하려면 ${requiredSubscription.join(' 또는 ')} 구독이 필요합니다.`
      );
    }

    return true;
  }
}
