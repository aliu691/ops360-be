import { Controller, Get, Param, Query } from '@nestjs/common';
import { MeetingsService } from './meetings.service';

@Controller('meetings')
export class MeetingsController {
  constructor(private readonly meetingsService: MeetingsService) {}

  @Get()
  async getMeetings(
    @Query('repName') repName?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    if (repName) {
      return this.meetingsService.getMeetingsByRep(repName, page, limit);
    }
    return this.meetingsService.getAllMeetings(page, limit);
  }

  @Get(':repName')
  async getMeetingsByRep(
    @Param('repName') repName: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.meetingsService.getMeetingsByRep(repName, page, limit);
  }
}
