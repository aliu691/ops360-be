import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import ormconfig from './db/ormconfig';

import { UploadsModule } from './modules/uploads/uploads.module';
import { MeetingsModule } from './modules/meetings/meetings.module';
//import { FindingsModule } from './modules/findings/findings.module';
import { KpiEngineModule } from './modules/kpi-engine/kpi-engine.module';
import { FiltersModule } from './modules/filters/filters.module';
import { CalendarModule } from './modules/calendar/calendar.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    UploadsModule,
    MeetingsModule,
    // FindingsModule,
    KpiEngineModule,
    FiltersModule,
    CalendarModule,
    UsersModule,

    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      autoLoadEntities: true, // ✅ NestJS runtime only
      synchronize: false, // ❌ NEVER true in staging/prod
      logging: false,
      ssl: {
        rejectUnauthorized: false, // ✅ required for Supabase / Render
      },
    }),
  ],
})
export class AppModule {}
