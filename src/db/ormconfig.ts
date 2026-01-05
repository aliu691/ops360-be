import { TypeOrmModuleOptions } from '@nestjs/typeorm';

const isPostgres = !!process.env.DATABASE_URL;

const ormconfig: TypeOrmModuleOptions = isPostgres
  ? {
      // ✅ STAGING / PROD (Supabase / Render)
      type: 'postgres',
      url: process.env.DATABASE_URL,
      autoLoadEntities: true,
      synchronize: false, // NEVER true outside local
      logging: false,
      ssl: {
        rejectUnauthorized: false, // required for Supabase
      },
    }
  : {
      // ⚠️ Legacy fallback (optional — can be deleted later)
      type: 'sqlite',
      database: 'data/ops360.sqlite',
      autoLoadEntities: true,
      synchronize: false,
      logging: false,
    };

export default ormconfig;
