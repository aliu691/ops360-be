import { Module } from '@nestjs/common';
import { KpiEngineService } from './kpi-engine.service';
import { KpiEngineController } from './kpi-engine.controller';
import { MeetingsModule } from '../meetings/meetings.module';

@Module({
  imports: [MeetingsModule],
  providers: [KpiEngineService],
  controllers: [KpiEngineController],
  exports: [KpiEngineService],
})
export class KpiEngineModule {}
