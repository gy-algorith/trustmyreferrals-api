import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { ChatChannel } from './chat-channel.entity';
import { User } from './user.entity';

export enum MessageContentType {
  TEXT = 'text',
  IMAGE = 'image',
  FILE = 'file',
  SYSTEM = 'system',
}

// 채팅 메시지 엔티티. Pulling 방식에 적합하도록 타임스탬프 및 인덱스 구성
@Entity('chat_messages')
@Index('idx_message_channel_created', ['channelId', 'createdAt'])
@Index('idx_message_sender', ['senderId'])
export class ChatMessage extends BaseEntity {
  @Column()
  channelId: string;

  @ManyToOne(() => ChatChannel, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'channelId' })
  channel: ChatChannel;

  @Column()
  senderId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'senderId' })
  sender: User;

  @Column({ type: 'enum', enum: MessageContentType, default: MessageContentType.TEXT })
  contentType: MessageContentType;

  // 텍스트 본문 (contentType이 TEXT/SYSTEM인 경우 사용)
  @Column({ type: 'text', nullable: true })
  text?: string;

  // 첨부 메타데이터 (이미지/파일 등)
  @Column({ type: 'jsonb', nullable: true })
  attachments?: Record<string, any>;

  // 클라이언트는 이 createdAt(UTC)을 자신의 타임존으로 변환 표시
  // BaseEntity.createdAt 사용 (인덱스에 포함됨)

  @Column({ default: false })
  isDeleted: boolean;
}


