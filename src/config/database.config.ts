import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions, TypeOrmOptionsFactory } from '@nestjs/typeorm';

@Injectable()
export class DatabaseConfig implements TypeOrmOptionsFactory {
  constructor(private configService: ConfigService) {}

  createTypeOrmOptions(): TypeOrmModuleOptions {
    return {
      type: 'postgres',
      host: this.configService.get('DB_HOST', 'localhost'),
      port: this.configService.get('DB_PORT', 5432),
      username: this.configService.get('DB_USERNAME', 'postgres'),
      password: this.configService.get('DB_PASSWORD', 'password'),
      database: this.configService.get('DB_DATABASE', 'trust_api'),
      schema: this.configService.get('DB_SCHEMA', 'public'),
      entities: [__dirname + '/../**/*.entity{.ts,.js}'],
      migrations: [__dirname + '/../database/migrations/*{.ts,.js}'],
      synchronize: false, // Disable auto-sync to prevent conflicts
      // 로깅 설정: 쿼리는 비활성화, 에러만 로깅
      logging: this.configService.get('NODE_ENV') === 'development' ? ['error', 'warn'] : false,
      ssl: this.configService.get('NODE_ENV') === 'production' ? { rejectUnauthorized: false } : false,
      // TypeORM 캐시 비활성화 (메타데이터 리프레시 강제)
      cache: false,
    };
  }
}
