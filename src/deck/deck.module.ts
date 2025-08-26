import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Deck } from '../entities/deck.entity';
import { User } from '../entities/user.entity';
import { Resume } from '../entities/resume.entity';
import { RequirementResponse } from '../entities/requirement-response.entity';
import { DeckController } from './deck.controller';
import { DeckService } from './deck.service';

@Module({
  imports: [TypeOrmModule.forFeature([Deck, User, Resume, RequirementResponse])],
  controllers: [DeckController],
  providers: [DeckService],
  exports: [DeckService],
})
export class DeckModule {}
