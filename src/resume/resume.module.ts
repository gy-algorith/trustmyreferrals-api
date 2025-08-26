import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { Resume } from '../entities/resume.entity';
import { ResumeValidation } from '../entities/resume-validation.entity';
import { Deck } from '../entities/deck.entity';
import { ResumeController } from './resume.controller';
import { ResumeSectionsController } from './resume-sections.controller';
import { ResumeValidationController } from './resume-validation.controller';
import { ResumeService } from './resume.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Resume, ResumeValidation, Deck]),
    MulterModule.register({
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
    }),
  ],
  controllers: [ResumeController, ResumeSectionsController, ResumeValidationController],
  providers: [ResumeService],
  exports: [ResumeService],
})
export class ResumeModule {}
