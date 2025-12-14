import { Controller, Get, Query } from '@nestjs/common';
import { FiltersService } from './filters.service';

@Controller('filters')
export class FiltersController {
  constructor(private readonly filtersService: FiltersService) {}

  @Get('months')
  getMonths() {
    return this.filtersService.getAvailableMonths();
  }

  @Get('weeks')
  getWeeks(@Query('month') month: string) {
    return this.filtersService.getWeeksForMonth(month);
  }

  @Get('quarters')
  getQuarters() {
    return this.filtersService.getAvailableQuarters();
  }
}
