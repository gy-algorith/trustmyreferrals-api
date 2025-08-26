import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';

@Module({
  imports: [
    CacheModule.register({
      store: require('cache-manager-memory-store'),
      ttl: 60 * 60 * 24, // 24시간
      max: 1000, // 최대 1000개 항목
    }),
  ],
  exports: [CacheModule],
})
export class CacheConfig {}
