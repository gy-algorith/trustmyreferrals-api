import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserUpdate } from '../entities/user-update.entity';
import { UserUpdatesController } from './user-updates.controller';
import { UserUpdatesService } from './user-updates.service';

@Module({
  imports: [TypeOrmModule.forFeature([UserUpdate])],
  controllers: [UserUpdatesController],
  providers: [UserUpdatesService],
  exports: [UserUpdatesService],
})
export class UserUpdatesModule {}
