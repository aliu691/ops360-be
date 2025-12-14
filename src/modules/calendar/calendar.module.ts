import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CalendarService } from './calendar.service';
import { CalendarController } from './calendar.controller';
import { Meeting } from '../meetings/meetings.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Meeting]), // ✅ REQUIRED
  ],
  controllers: [CalendarController],
  providers: [CalendarService],
})
export class CalendarModule {}
