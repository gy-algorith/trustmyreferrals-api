import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentController } from './payment.controller';
import { WebhookController } from './webhook.controller';
import { PaymentService } from './payment.service';
import { User } from '../entities/user.entity';
import { Transaction } from '../entities/transaction.entity';
import { Settings } from '../entities/settings.entity';
import { SubscriptionPlan } from '../entities/subscription-plan.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Transaction, Settings, SubscriptionPlan]),
  ],
  controllers: [PaymentController, WebhookController],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentsModule {}
