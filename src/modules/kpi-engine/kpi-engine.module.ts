import { Module } from '@nestjs/common';
import { KpiEngineService } from './kpi-engine.service';
import { KpiEngineController } from './kpi-engine.controller';
import { MeetingsModule } from '../meetings/meetings.module';
import { UsersService } from '../users/users.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [MeetingsModule, UsersModule],
  providers: [KpiEngineService],
  controllers: [KpiEngineController],
  exports: [KpiEngineService],
})
export class KpiEngineModule {}
