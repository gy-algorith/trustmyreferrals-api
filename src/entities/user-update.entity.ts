import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';

export enum UpdateType {
  EVENT = 'event',        // 시스템 이벤트 (가입, 초대 응답 등) - 추천인용
  POST = 'post',          // 사용자가 직접 작성한 포스트 - 후보자 본인용
}

// user가 가입하거나 자신의 피드에 기록하는것들을 저장하고. 아래와 같이 referrer가 확인할 수 있도록 함.
// Posted by gwangyun jung on August 17, 2025
// update 2
// Posted by gwangyun jung on August 17, 2025
// update 12
// Posted by gwangyun jung on August 17, 2025
// update 1
// Posted by gwangyun jung on August 17, 2025
// gwangyun jung joined your deck through your invitation.
// On August 10, 2025
// 위와같이 후보자가 직접 입력한 포스트나 가입, 초대에 응함 등과같은 update를 기록함
@Entity('user_updates')
export class UserUpdate extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // 사용자 ID (후보자)
  @Column()
  userId: string;

  // 관계 설정
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  // 업데이트 타입
  @Column({
    type: 'enum',
    enum: UpdateType,
    default: UpdateType.EVENT,
    name: 'type' // 데이터베이스 컬럼명과 일치
  })
  updateType: UpdateType;

  // 업데이트 내용 (HTML 허용)
  @Column({ type: 'text', nullable: true })
  description: string;

  // 메타데이터 (JSON 형태로 추가 정보 저장)
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;
}
