import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionPlan } from '../entities/subscription-plan.entity';
import { User } from '../entities/user.entity';
import { Transaction } from '../entities/transaction.entity';
import { Settings } from '../entities/settings.entity';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SubscriptionPlan, User, Transaction, Settings]),
    PaymentsModule,
  ],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
