import { Controller, Get, Param, Query, Req } from '@nestjs/common';
import { MeetingsService } from './meetings.service';

@Controller('meetings')
export class MeetingsController {
  constructor(private readonly meetingsService: MeetingsService) {}

  /**
   * GET /meetings
   * Supports:
   * - Optional repName
   * - Pagination
   * - Optional reporting month + week filters
   */
  // @Get()
  // async getMeetings(
  //   @Query('repName') repName?: string,
  //   @Query('month') month?: string,
  //   @Query('week') week?: number,
  //   @Query('page') page = 1,
  //   @Query('limit') limit = 20,
  // ) {
  //   const filters = {
  //     month,
  //     week: week !== undefined ? Number(week) : undefined,
  //   };

  //   // Rep-specific view
  //   if (repName) {
  //     return this.meetingsService.getMeetingsByRep(
  //       repName,
  //       page,
  //       limit,
  //       filters,
  //     );
  //   }

  //   // Default UI view (⚠️ MUST FILTER)
  //   return this.meetingsService.getAllMeetings(page, limit, filters);
  // }

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

  /**
   * GET /meetings/:repName
   * Rep-specific endpoint with filters
   */
  @Get(':repName')
  async getMeetingsByRep(
    @Param('repName') repName: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('month') month?: string,
    @Query('week') week?: string,
  ) {
    return this.meetingsService.getMeetingsByRep(repName, page, limit, {
      month,
      week: week ? Number(week) : undefined,
    });
  }
}
