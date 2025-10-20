import { DataSource } from 'typeorm';
import { config } from 'dotenv';

config();

const isSSL = process.env.NODE_ENV !== 'local';

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_DATABASE || 'trust_united',
  schema: process.env.DB_SCHEMA || 'public',
  entities: [__dirname + '/src/**/*.entity{.ts,.js}'],
  // Only include the chat migration to prevent legacy conflicts
  migrations: [
    __dirname + '/src/database/migrations/1756259654713-AddChatEntities{.ts,.js}',
  ],
  synchronize: false,
  logging: true,
  ssl: isSSL,
  extra: isSSL ? { ssl: { rejectUnauthorized: false } } : undefined,
});


