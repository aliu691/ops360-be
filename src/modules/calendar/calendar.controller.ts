import { Controller, Get, Query } from '@nestjs/common';
import { CalendarService } from './calendar.service';

@Controller('calendar')
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Get('months')
  getMonths() {
    return this.calendarService.getMonths();
  }

  @Get('weeks')
  getWeeks(@Query('month') month: string) {
    return this.calendarService.getWeeksForMonth(month);
  }
}
