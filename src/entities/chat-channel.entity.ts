import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from './base.entity';

export enum ChatChannelType {
  DIRECT = 'direct',
  GROUP = 'group',
}

// 채팅 채널(방) 엔티티. 1:1(DIRECT) 또는 그룹(GROUP) 채팅을 모두 표현
@Entity('chat_channels')
@Index('idx_chat_channel_type', ['type'])
@Index('idx_chat_channel_last_message_at', ['lastMessageAt'])
export class ChatChannel extends BaseEntity {
  @Column({ type: 'enum', enum: ChatChannelType, default: ChatChannelType.DIRECT })
  type: ChatChannelType;

  // 그룹 채널명 (DIRECT의 경우 null)
  @Column({ type: 'varchar', length: 100, nullable: true })
  name?: string;

  // 마지막 메시지 시각 (pulling 정렬/페이지네이션 용도)
  @Column({ type: 'timestamp', nullable: true })
  lastMessageAt?: Date;

  @Column({ default: true })
  isActive: boolean;

  // 확장용 메타데이터 (예: 아바타, 주제 등)
  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;
}


