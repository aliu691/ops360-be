import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import { User } from './modules/users/users.entity';
import { Meeting } from './modules/meetings/meetings.entity';

dotenv.config({
  path: process.env.NODE_ENV === 'staging' ? '.env.staging' : '.env',
});

const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  entities: [User, Meeting],
  migrations: ['dist/migrations/*.js'],
  synchronize: false,
  logging: false,
});

export default AppDataSource;
