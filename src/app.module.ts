import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { TerminusModule } from '@nestjs/terminus';
import { ScheduleModule } from '@nestjs/schedule';

import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProfilesModule } from './profiles/profiles.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { RequirementsModule } from './requirements/requirements.module';
import { ProposalsModule } from './proposals/proposals.module';
import { ChatModule } from './chat/chat.module';
import { PaymentsModule } from './payments/payments.module';
import { CommonModule } from './common/common.module';
import { UserUpdatesModule } from './user-updates/user-updates.module';
import { DeckModule } from './deck/deck.module';
import { ResumeModule } from './resume/resume.module';
import { CandidateInterestModule } from './candidate-interest/candidate-interest.module';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthController } from './health.controller';

import { DatabaseConfig } from './config/database.config';
import { CacheConfig } from './config/cache.config';
import { ConfigService } from '@nestjs/config';
import { LoggingMiddleware } from './common/middlewares/logging.middleware';

@Module({
  imports: [
    // 환경 변수 설정
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // 데이터베이스 설정
    TypeOrmModule.forRootAsync({
      useClass: DatabaseConfig,
    }),

    // 캐시 설정 (로컬 메모리로 시작)
    CacheConfig,

    // Rate Limiting
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60000,
          limit: 100,
        },
      ],
    }),

    // 스케줄링
    ScheduleModule.forRoot(),

    // Health Check
    TerminusModule,

    // 기능 모듈들
    AuthModule,
    UsersModule,
    ProfilesModule,
    SubscriptionsModule,
    RequirementsModule,
    ProposalsModule,
    ChatModule,
    PaymentsModule,
    CommonModule,
    UserUpdatesModule,
    DeckModule,
    ResumeModule,
    CandidateInterestModule,
  ],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(LoggingMiddleware)
      .forRoutes('*'); // 모든 라우트에 로깅 미들웨어 적용
  }
}
