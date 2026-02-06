import 'reflect-metadata';
import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';

dotenv.config({
  path: process.env.NODE_ENV === 'staging' ? '.env.staging' : '.env.production',
});

const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },

  // ✅ THIS IS THE KEY FIX
  entities: ['src/**/*.entity.ts'],

  // ✅ use TS migrations for generation
  migrations: ['src/migrations/*.ts'],

  synchronize: false,
  logging: false,
});

export default AppDataSource;
