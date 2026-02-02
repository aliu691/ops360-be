import { Controller, Get, Param, Query, Req } from '@nestjs/common';
import { MeetingsService } from './meetings.service';

@Controller('meetings')
export class MeetingsController {
  constructor(private readonly meetingsService: MeetingsService) {}

  @Get()
  async getMeetings(
    @Req() req,
    @Query('repName') repName?: string,
    @Query('month') month?: string,
    @Query('week') week?: number,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    const filters = {
      month,
      week: week !== undefined ? Number(week) : undefined,
      repName,
    };

    return this.meetingsService.getMeetingsForActor(
      req.user,
      page,
      limit,
      filters,
    );
  }
}
