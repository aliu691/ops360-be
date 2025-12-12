// import { Controller, Get, Param } from '@nestjs/common';
// import { MeetingsService } from './meetings.service';

// @Controller('meetings')
// export class MeetingsController {
//   constructor(private readonly meetingsService: MeetingsService) {}

//   @Get()
//   async getAllMeetings() {
//     return this.meetingsService.getAllMeetings();
//   }

//   @Get(':repName')
//   async getMeetingsByRep(@Param('repName') repName: string) {
//     return this.meetingsService.getMeetingsByRep(repName);
//   }
// }

import { Controller, Get, Param, Query } from '@nestjs/common';
import { MeetingsService } from './meetings.service';

@Controller('meetings')
export class MeetingsController {
  constructor(private readonly meetingsService: MeetingsService) {}

  @Get()
  async getMeetings(@Query('repName') repName?: string) {
    if (repName) {
      return this.meetingsService.getMeetingsByRep(repName);
    }
    return this.meetingsService.getAllMeetings();
  }

  @Get(':repName')
  async getMeetingsByRep(@Param('repName') repName: string) {
    return this.meetingsService.getMeetingsByRep(repName);
  }
}
