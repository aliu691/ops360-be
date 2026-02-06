import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { CalendarService } from './calendar.service';

@Controller('calendar')
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Get('months')
  getMonths() {
    return this.calendarService.getMonths();
  }

  @Get('weeks')
  getWeeks(@Query('month') month: string, @Query('userId') userId?: string) {
    if (!month) {
      throw new BadRequestException('month is required (YYYY-MM)');
    }

    if (!userId || isNaN(Number(userId))) {
      throw new BadRequestException('userId is required');
    }

    return this.calendarService.getWeeksForMonth(month, Number(userId));
  }
}
