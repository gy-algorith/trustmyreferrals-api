import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RequirementsController } from './requirements.controller';
import { RequirementsService } from './services/requirements.service';
import { RequirementResponseService } from './services/requirement-response.service';
import { Requirement } from '../entities/requirement.entity';
import { RequirementResponse } from '../entities/requirement-response.entity';
import { User } from '../entities/user.entity';
import { Deck } from '../entities/deck.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Requirement, RequirementResponse, User, Deck]),
  ],
  controllers: [RequirementsController],
  providers: [RequirementsService, RequirementResponseService],
  exports: [RequirementsService, RequirementResponseService],
})
export class RequirementsModule {}
