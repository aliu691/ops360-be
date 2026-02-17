import { Controller, Get, Param, Query, Req, Delete } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
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
    const actor = req.user;

    // 🔒 USERS: repName is forbidden and ignored
    const filters =
      actor.type === 'ADMIN'
        ? {
            repName,
            month,
            week: week !== undefined ? Number(week) : undefined,
          }
        : {
            month,
            week: week !== undefined ? Number(week) : undefined,
          };

    return this.meetingsService.getMeetingsForActor(
      actor,
      Number(page),
      Number(limit),
      filters,
    );
  }

  @Delete(':id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async deleteMeeting(@Req() req, @Param('id') id: number) {
    const actor = req.user;
    return this.meetingsService.deleteMeeting(actor, Number(id));
  }
}
