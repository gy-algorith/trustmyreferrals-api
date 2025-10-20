import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReferrerCircle } from '../entities/referrer-circle.entity';
import { User } from '../entities/user.entity';
import { CircleService } from './circle.service';
import { CircleController } from './circle.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ReferrerCircle, User])],
  providers: [CircleService],
  controllers: [CircleController],
  exports: [CircleService],
})
export class CircleModule {}


