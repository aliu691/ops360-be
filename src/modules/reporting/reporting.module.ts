import { Module } from '@nestjs/common';
import { MeetingsReportingService } from './meetings-reporting.service';
import { MeetingsReportingController } from './meetings-reporting.controller';
import { MeetingsModule } from '../meetings/meetings.module';
import { UsersModule } from '../users/users.module';
import { CalendarModule } from '../calendar/calendar.module';
import { PdfService } from './pdf.service';

@Module({
  imports: [MeetingsModule, UsersModule, CalendarModule],
  providers: [MeetingsReportingService, PdfService],
  controllers: [MeetingsReportingController],
})
export class ReportingModule {}
