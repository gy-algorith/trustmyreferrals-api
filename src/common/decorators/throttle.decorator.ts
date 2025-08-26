import { SetMetadata } from '@nestjs/common';

/**
 * 특정 엔드포인트에 대한 속도 제한 설정을 위한 데코레이터
 * @param limit 허용되는 요청 수
 * @param ttl 시간 간격 (초)
 */
export const Throttle = (limit: number, ttl: number) =>
  SetMetadata('throttler', { limit, ttl });
