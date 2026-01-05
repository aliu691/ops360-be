// src/scripts/migrate-staging-sqlite-to-postgres.ts

/**
 * ONE-OFF MIGRATION SCRIPT
 * DO NOT RUN AGAIN
 * Executed on 2026-01-05 (staging)
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.staging' });

import { DataSource } from 'typeorm';
import { User } from '../modules/users/users.entity';
import { Meeting } from '../modules/meetings/meetings.entity';

console.log('🚀 STAGING migration');
console.log('Using STAGING_DATABASE_URL:', process.env.STAGING_DATABASE_URL);

/* ---------------------------------------------
   ENV SAFETY CHECK
---------------------------------------------- */
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL is missing. Check .env.staging');
  process.exit(1);
}

console.log('✅ Using DATABASE_URL:', process.env.DATABASE_URL);

/* ---------- SOURCE: SQLITE (old staging) ---------- */
const sqliteSource = new DataSource({
  type: 'sqlite',
  database: 'data/ops360.sqlite',
  entities: [User, Meeting],
});

/* ---------- TARGET: POSTGRES (new staging) ---------- */
const postgresTarget = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [User, Meeting],
  synchronize: false, // ❗ NEVER true in prod/staging
});

/* ---------------------------------------------
   MIGRATION
---------------------------------------------- */
async function migrateAllStagingData() {
  console.log('🚀 Starting STAGING (SQLite) → STAGING (Postgres) migration');

  await sqliteSource.initialize();
  await postgresTarget.initialize();

  /* ---------------- USERS ---------------- */
  const users = await sqliteSource.getRepository(User).find();
  console.log(`👥 Found ${users.length} users`);

  if (users.length) {
    await postgresTarget
      .getRepository(User)
      .createQueryBuilder()
      .insert()
      .into(User)
      .values(users)
      .orIgnore() // ✅ prevents duplicates
      .execute();
  }

  /* ---------------- MEETINGS ---------------- */
  const meetings = await sqliteSource.getRepository(Meeting).find();
  console.log(`📄 Found ${meetings.length} meetings`);

  if (meetings.length) {
    await postgresTarget
      .getRepository(Meeting)
      .createQueryBuilder()
      .insert()
      .into(Meeting)
      .values(meetings)
      .orIgnore()
      .execute();
  }

  await sqliteSource.destroy();
  await postgresTarget.destroy();

  console.log('✅ Staging migration complete');
}

/* ---------------------------------------------
   RUN
---------------------------------------------- */
migrateAllStagingData()
  .then(() => {
    console.log('🎉 Done');
    process.exit(0);
  })
  .catch((err) => {
    console.error('🔥 Migration failed', err);
    process.exit(1);
  });
