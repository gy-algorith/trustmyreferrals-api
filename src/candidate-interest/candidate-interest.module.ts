import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CandidateInterest } from '../entities/candidate-interest.entity';
import { User } from '../entities/user.entity';
import { CandidateInterestController } from './candidate-interest.controller';
import { CandidateInterestService } from './candidate-interest.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([CandidateInterest, User]),
  ],
  controllers: [CandidateInterestController],
  providers: [CandidateInterestService],
  exports: [CandidateInterestService],
})
export class CandidateInterestModule {}
