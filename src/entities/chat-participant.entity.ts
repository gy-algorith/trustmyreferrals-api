import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { BaseEntity } from './base.entity';
import { ChatChannel } from './chat-channel.entity';
import { User } from './user.entity';

export enum ParticipantRole {
  MEMBER = 'member',
  ADMIN = 'admin',
}

// 채널 참가자 엔티티. 채널과 사용자 사이의 membership, 읽음 상태를 관리
@Entity('chat_participants')
@Unique('uq_channel_user', ['channelId', 'userId'])
@Index('idx_participant_user', ['userId'])
@Index('idx_participant_channel', ['channelId'])
export class ChatParticipant extends BaseEntity {
  @Column()
  channelId: string;

  @ManyToOne(() => ChatChannel, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'channelId' })
  channel: ChatChannel;

  @Column()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'enum', enum: ParticipantRole, default: ParticipantRole.MEMBER })
  role: ParticipantRole;

  // 클라이언트 타임존 표시를 위해 메시지는 UTC로 저장, lastReadAt도 UTC로 저장
  @Column({ type: 'timestamp', nullable: true })
  lastReadAt?: Date;

  @Column({ default: true })
  isActive: boolean;
}


