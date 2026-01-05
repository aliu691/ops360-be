// src/data-source.ts
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { User } from './modules/users/users.entity';
import { Meeting } from './modules/meetings/meetings.entity';

export const AppDataSource = new DataSource({
  type: 'sqlite',
  database: 'data/ops360.sqlite',

  entities: [User, Meeting],

  migrations: ['dist/migrations/*.js'],

  logging: false,
});
