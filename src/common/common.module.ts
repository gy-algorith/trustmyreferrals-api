import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityLog } from '../entities/activity-log.entity';
import { EmailVerification } from '../entities/email-verification.entity';
import { Settings } from '../entities/settings.entity';
import { LoggingService } from './services/logging.service';
import { SimpleMetricsService } from './services/simple-metrics.service';
import { EmailService } from './services/email.service';

@Module({
  imports: [TypeOrmModule.forFeature([ActivityLog, EmailVerification, Settings])],
  providers: [LoggingService, SimpleMetricsService, EmailService],
  exports: [LoggingService, SimpleMetricsService, EmailService],
})
export class CommonModule {}
