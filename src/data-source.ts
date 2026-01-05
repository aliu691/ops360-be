import 'dotenv/config';
import { DataSource } from 'typeorm';
import { User } from './modules/users/users.entity';
import { Meeting } from './modules/meetings/meetings.entity';

const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // required for Supabase
  },
  entities: [User, Meeting],
  migrations: ['dist/migrations/*.js'],
  synchronize: false,
  logging: false,
});

export default AppDataSource;
