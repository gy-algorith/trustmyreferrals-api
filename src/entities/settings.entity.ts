import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('settings')
export class Settings {
  @PrimaryGeneratedColumn('uuid')
  @ApiProperty({ description: 'Settings ID' })
  id: string;

  @Column({ unique: true })
  @ApiProperty({ description: 'Setting key (unique identifier)' })
  key: string;

  @Column({ type: 'text' })
  @ApiProperty({ description: 'Setting value (JSON string for complex data)' })
  value: string;

  @Column({ type: 'text', nullable: true })
  @ApiProperty({ description: 'Setting description' })
  description?: string;

  @Column({ default: 'string' })
  @ApiProperty({ description: 'Value type (string, number, boolean, json)' })
  type: 'string' | 'number' | 'boolean' | 'json';

  @Column({ default: true })
  @ApiProperty({ description: 'Whether the setting is active' })
  isActive: boolean;

  @CreateDateColumn()
  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @UpdateDateColumn()
  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;

  // Helper methods for type-safe value access
  getStringValue(): string {
    return this.value;
  }

  getNumberValue(): number {
    return parseFloat(this.value);
  }

  getBooleanValue(): boolean {
    return this.value === 'true';
  }

  getJsonValue(): any {
    try {
      return JSON.parse(this.value);
    } catch {
      return null;
    }
  }

  setValue(value: any): void {
    if (typeof value === 'object') {
      this.value = JSON.stringify(value);
      this.type = 'json';
    } else {
      this.value = String(value);
      this.type = typeof value as 'string' | 'number' | 'boolean';
    }
  }
}
