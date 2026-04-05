import {
  Controller,
  Get,
  Query,
  Param,
  BadRequestException,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { MeetingsReportingService } from './meetings-reporting.service';
import { MeetingsService } from '../meetings/meetings.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { UsersService } from '../users/users.service'; // ✅ assuming you have this
import { MonthlyReportResponse } from './dto/monthly-report.dto';
import { buildMonthlyReportHTML } from './templates/monthly-report.template';
import { PdfService } from './pdf.service';

@Controller('reporting')
export class MeetingsReportingController {
  constructor(
    private readonly reportingService: MeetingsReportingService,
    private readonly meetingsService: MeetingsService,
    private readonly usersService: UsersService,
    private readonly pdfService: PdfService,
  ) {}

  /* ---------------------------------------------
     📆 MONTHLY REPORT
  ---------------------------------------------- */
  @Get('meetings/monthly/:repName')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async getMonthlyReport(
    @Param('repName') repName: string,
    @Query('month') month?: string,
  ): Promise<MonthlyReportResponse> {
    if (!month) {
      throw new BadRequestException('month is required (e.g. 2026-03)');
    }

    const user = await this.usersService.findByName(repName); // 🔥 adjust to your method
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const meetings = await this.meetingsService.getAllMeetingsByRep(repName, {
      month,
    });

    return await this.reportingService.buildMonthlyReport(
      meetings,
      month,
      user.id, // ✅ REQUIRED
    );
  }

  @Get('meetings/monthly/export/:repName')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async exportMonthlyReport(
    @Param('repName') repName: string,
    @Query('month') month: string,
    @Res() res: Response,
  ) {
    const user = await this.usersService.findByName(repName);

    if (!user) {
      throw new BadRequestException('User not found');
    }

    const meetings = await this.meetingsService.getAllMeetingsByRep(repName, {
      month,
    });

    const report = await this.reportingService.buildMonthlyReport(
      meetings,
      month,
      user.id,
    );

    const html = buildMonthlyReportHTML(report, repName, month);

    const pdfBuffer = await this.pdfService.generateMeetingReportPdf(html);

    const [year, m] = month.split('-');

    const date = new Date(Number(year), Number(m) - 1);

    const monthName = date.toLocaleString('en-US', {
      month: 'long',
    });

    const fileName = `Meeting_Report_${repName}_${monthName}_${year}.pdf`;

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${fileName}"`,
    });

    res.send(pdfBuffer);
  }

  /* ---------------------------------------------
     📊 QUARTERLY REPORT
  ---------------------------------------------- */
  //   @Get('meetings/quarterly/:repName')
  //   @Roles('ADMIN', 'SUPER_ADMIN')
  //   async getQuarterlyReport(
  //     @Param('repName') repName: string,
  //     @Query('quarter') quarter?: string,
  //   ) {
  //     if (!quarter) {
  //       throw new BadRequestException('quarter is required (e.g. 2026-Q1)');
  //     }

  //     const user = await this.usersService.findByName(repName);
  //     if (!user) {
  //       throw new BadRequestException('User not found');
  //     }

  //     let meetings = await this.meetingsService.getAllMeetingsByRep(repName);

  //     const [yearStr, qStr] = quarter.split('-Q');
  //     const year = Number(yearStr);
  //     const q = Number(qStr);

  //     meetings = meetings.filter((m) => {
  //       const d = new Date(m.createdAt);
  //       const mq = Math.floor(d.getMonth() / 3) + 1;
  //       return d.getFullYear() === year && mq === q;
  //     });

  //     return await this.reportingService.buildQuarterlyReport(
  //       meetings,
  //       quarter,
  //       user.id, // ✅ REQUIRED
  //     );
  //   }

  /* ---------------------------------------------
     📅 YEARLY REPORT
  ---------------------------------------------- */
  //   @Get('meetings/yearly/:repName')
  //   @Roles('ADMIN', 'SUPER_ADMIN')
  //   async getYearlyReport(
  //     @Param('repName') repName: string,
  //     @Query('year') year?: number,
  //   ) {
  //     if (!year) {
  //       throw new BadRequestException('year is required (e.g. 2026)');
  //     }

  //     const user = await this.usersService.findByName(repName);
  //     if (!user) {
  //       throw new BadRequestException('User not found');
  //     }

  //     let meetings = await this.meetingsService.getAllMeetingsByRep(repName);

  //     meetings = meetings.filter((m) => {
  //       const d = new Date(m.createdAt);
  //       return d.getFullYear() === Number(year);
  //     });

  //     return await this.reportingService.buildYearlyReport(
  //       meetings,
  //       Number(year),
  //       user.id, // ✅ REQUIRED
  //     );
  //   }
}
