import 'dotenv/config';
import { DataSource } from 'typeorm';
import { AlertEntity } from './alerts/entities/alert.entity';
import { DeviceTokenEntity } from './auth/entities/device-token.entity';
import { UserEntity } from './auth/entities/user.entity';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST,
  port: parseInt(process.env.DATABASE_PORT ?? '5432', 10),
  database: process.env.DATABASE_NAME,
  username: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  entities: [UserEntity, AlertEntity, DeviceTokenEntity],
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
});
