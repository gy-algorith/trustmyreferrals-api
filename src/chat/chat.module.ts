import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatChannel } from '../entities/chat-channel.entity';
import { ChatParticipant } from '../entities/chat-participant.entity';
import { ChatMessage } from '../entities/chat-message.entity';
import { User } from '../entities/user.entity';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ChatChannel, ChatParticipant, ChatMessage, User])],
  providers: [ChatService],
  controllers: [ChatController],
})
export class ChatModule {}
