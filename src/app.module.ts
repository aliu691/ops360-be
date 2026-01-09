import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

import { UploadsModule } from './modules/uploads/uploads.module';
import { MeetingsModule } from './modules/meetings/meetings.module';
import { KpiEngineModule } from './modules/kpi-engine/kpi-engine.module';
import { FiltersModule } from './modules/filters/filters.module';
import { CalendarModule } from './modules/calendar/calendar.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath:
        process.env.NODE_ENV === 'production'
          ? '.env.production'
          : '.env.staging',
    }),

    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      autoLoadEntities: true,
      synchronize: false,
      logging: false,

      ssl: {
        rejectUnauthorized: false,
      },

      extra: {
        max: 3,
        connectionTimeoutMillis: 20_000,
        idleTimeoutMillis: 5_000,
        keepAlive: true,
      },
    }),

    UploadsModule,
    MeetingsModule,
    KpiEngineModule,
    FiltersModule,
    CalendarModule,
    UsersModule,
  ],
})
export class AppModule {}
