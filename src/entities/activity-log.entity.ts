import {
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn
} from 'typeorm';
import { BaseEntity } from './base.entity';


// 활동이력을 기록하는 엔티티
@Entity('activity_logs')
export class ActivityLog extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  userId: string;

  @Column()
  @Index()
  action: string;

  @Column({ type: 'text', nullable: true })
  details: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  timestamp: Date;
}
