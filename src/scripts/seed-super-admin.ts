// /**
//  * ONE-TIME SUPER ADMIN SEED SCRIPT
//  * Safe to run multiple times (idempotent)
//  *
//  * Usage:
//  *  STAGING:     NODE_ENV=staging npx ts-node src/scripts/seed-super-admin.ts
//  *  PRODUCTION: NODE_ENV=production npx ts-node src/scripts/seed-super-admin.ts
//  */

// /**
//  * ONE-TIME SUPER ADMIN SEED SCRIPT
//  */

// import * as dotenv from 'dotenv';

// // --------------------------------------------------
// // Load correct env file
// // --------------------------------------------------
// const env = process.env.NODE_ENV ?? 'staging';

// dotenv.config({
//   path: env === 'production' ? '.env.production' : '.env.staging',
// });

// import { DataSource } from 'typeorm';
// import * as bcrypt from 'bcryptjs';
// import { Admin, AdminRole, AdminStatus } from '../modules/admins/admins.entity';

// // --------------------------------------------------
// // Safety check
// // --------------------------------------------------
// if (!process.env.DATABASE_URL) {
//   console.error('❌ DATABASE_URL is not set');
//   process.exit(1);
// }

// console.log(`🚀 Seeding SUPER_ADMIN on ${env.toUpperCase()}`);
// console.log('DB:', process.env.DATABASE_URL.replace(/:\/\/.*@/, '://****@'));

// // --------------------------------------------------
// // Data source
// // --------------------------------------------------
// const dataSource = new DataSource({
//   type: 'postgres',
//   url: process.env.DATABASE_URL,
//   entities: [Admin],
//   ssl: env === 'production' ? { rejectUnauthorized: false } : false,
// });

// // --------------------------------------------------
// // Seed logic
// // --------------------------------------------------
// async function seedSuperAdmin() {
//   await dataSource.initialize();

//   const repo = dataSource.getRepository(Admin);

//   // 🔐 Only ONE super admin forever
//   const existing = await repo.findOne({
//     where: { role: AdminRole.SUPER_ADMIN },
//   });

//   if (existing) {
//     console.log('✅ SUPER_ADMIN already exists. Skipping.');
//     await dataSource.destroy();
//     return;
//   }

//   const passwordHash = await bcrypt.hash('Al1u@123$$$', 10);

//   const admin = repo.create({
//     email: 'aliu@techware.ng',
//     passwordHash,
//     role: AdminRole.SUPER_ADMIN,
//     status: AdminStatus.ACTIVE,
//   });

//   await repo.save(admin);

//   console.log('🎉 SUPER_ADMIN created');
//   console.log('📧 Email: aliu@techware.ng');
//   console.log('🔑 Password: Al1u@123$$$');

//   await dataSource.destroy();
// }

// // --------------------------------------------------
// seedSuperAdmin().catch((err) => {
//   console.error('❌ Seed failed', err);
//   process.exit(1);
// });
