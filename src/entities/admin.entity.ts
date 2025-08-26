import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';


export enum AdminStatus {
  PENDING = 'pending',
  // 필요시 다른 상태 추가
}

export enum AdminPermissionLevel {
  STANDARD = 'standard',
  // 필요시 다른 권한 추가
}

@Entity('admins')
export class Admin {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({ nullable: true })
  firstName: string;

  @Column({ nullable: true })
  lastName: string;

  @Column({ nullable: true })
  phoneNumber: string;

  @Column({
    type: 'enum',
    enum: AdminStatus,
    default: AdminStatus.PENDING,
  })
  status: AdminStatus;

  @Column({ nullable: true })
  refreshToken: string;

  @Column({
    type: 'enum',
    enum: AdminPermissionLevel,
    default: AdminPermissionLevel.STANDARD,
  })
  permissionLevel: AdminPermissionLevel;

  @Column({ default: false })
  canManageUsers: boolean;

  @Column({ default: false })
  canManagePayments: boolean;

  @Column({ default: false })
  canManageContent: boolean;

  @Column({ default: false })
  canManageSettings: boolean;
} 