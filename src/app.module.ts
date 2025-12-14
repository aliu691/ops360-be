import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import ormconfig from './db/ormconfig';

import { UploadsModule } from './modules/uploads/uploads.module';
import { MeetingsModule } from './modules/meetings/meetings.module';
//import { FindingsModule } from './modules/findings/findings.module';
import { KpiEngineModule } from './modules/kpi-engine/kpi-engine.module';
import { FiltersModule } from './modules/filters/filters.module';

@Module({
  imports: [
    TypeOrmModule.forRoot(ormconfig),
    UploadsModule,
    MeetingsModule,
    //FindingsModule,
    KpiEngineModule,
    FiltersModule,
  ],
})
export class AppModule {}
