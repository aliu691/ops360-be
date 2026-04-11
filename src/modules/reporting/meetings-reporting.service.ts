import { Injectable } from '@nestjs/common';
import { MeetingRow } from '../kpi-engine/types/kpi-types';
import { CalendarService } from '../calendar/calendar.service';
import { MonthlyReportResponse } from './dto/monthly-report.dto';
import { Meeting } from '../meetings/meetings.entity';

const CONFIG = {
  WEEKLY_TARGET: 5,
  WEEKLY_PRESALES_TARGET: 2,
};

@Injectable()
export class MeetingsReportingService {
  constructor(private readonly calendarService: CalendarService) {}

  /* ---------------------------------------------
     📆 MONTHLY REPORT (FIXED ✅)
  ---------------------------------------------- */

  async buildMonthlyReport(
    meetings: Meeting[],
    month: string,
    userId: number,
  ): Promise<MonthlyReportResponse> {
    /* ---------------------------------------------
     📊 TOTALS
  ---------------------------------------------- */
    const totalMeetings = meetings.length;

    const meetingsWithPresales = meetings.filter(
      (m) => Array.isArray(m.preSalesOwners) && m.preSalesOwners.length > 0,
    ).length;

    /* ---------------------------------------------
     📆 CALENDAR WEEKS (SOURCE OF TRUTH)
  ---------------------------------------------- */
    const weeksResponse = await this.calendarService.getWeeksForMonth(
      month,
      userId,
    );

    const totalWeeks = weeksResponse.items.length;

    const targetMeetings = totalWeeks * 5;
    const targetPresales = totalWeeks * 2;

    /* ---------------------------------------------
     📊 PERFORMANCE
  ---------------------------------------------- */
    const meetingAchievementRate = this.getRate(totalMeetings, targetMeetings);

    const presalesAchievementRate = this.getRate(
      meetingsWithPresales,
      targetPresales,
    );

    /* ---------------------------------------------
     📈 CLIENT ANALYTICS
  ---------------------------------------------- */
    const clientMap = new Map<string, number>();

    for (const m of meetings) {
      const key = (m.customerName || 'UNKNOWN').trim();
      clientMap.set(key, (clientMap.get(key) || 0) + 1);
    }

    let mostVisitedClients: string[] = [];
    let mostVisits = 0;

    for (const [client, count] of clientMap.entries()) {
      if (count > mostVisits) {
        mostVisits = count;
        mostVisitedClients = [client]; // reset with new leader
      } else if (count === mostVisits) {
        mostVisitedClients.push(client); // tie → add
      }
    }

    const clientBreakdown = Array.from(clientMap.entries())
      .map(([client, count]) => ({
        client,
        meetings: count,
      }))
      .sort((a, b) => b.meetings - a.meetings);

    /* ---------------------------------------------
     🗓️ WEEK LABEL MAP
  ---------------------------------------------- */
    const weekMap = new Map(weeksResponse.items.map((w) => [w.week, w.label]));

    /* ---------------------------------------------
     📋 NORMALIZE MEETINGS LIST (FOR UI)
  ---------------------------------------------- */
    const meetingList = meetings.map((m) => ({
      id: m.id,
      customerName: m.customerName,
      primaryContact: m.primaryContact ?? null,
      meetingPurpose: m.meetingPurpose ?? null,
      meetingOutcome: m.meetingOutcome ?? null,

      reportingWeek: m.reportingWeek ?? 0, // ✅ FIXED (number)

      weekLabel:
        weekMap.get(m.reportingWeek) ?? `Week ${m.reportingWeek ?? 'N/A'}`,

      preSalesOwners: Array.isArray(m.preSalesOwners)
        ? m.preSalesOwners.map((u: any) => ({
            id: u.id,
            firstName: u.firstName,
            lastName: u.lastName,
          }))
        : [],
    }));

    /* ---------------------------------------------
     📦 RESPONSE
  ---------------------------------------------- */
    return {
      period: 'MONTHLY',

      totals: {
        meetings: totalMeetings,
        meetingsWithPresales,
      },

      targets: {
        meetings: targetMeetings,
        presales: targetPresales,
        weeks: totalWeeks,
      },

      performance: {
        meetingAchievementRate,
        presalesAchievementRate,
      },

      deltas: {
        meetingDelta: totalMeetings - targetMeetings,
        presalesDelta: meetingsWithPresales - targetPresales,
      },

      analytics: {
        mostVisitedClients,
        mostVisits,
        uniqueClients: clientMap.size,
        clientBreakdown,
      },

      meetings: meetingList,
    };
  }

  /* ---------------------------------------------
     📊 QUARTERLY REPORT (FIXED ✅)
  ---------------------------------------------- */
  async buildQuarterlyReport(
    meetings: MeetingRow[],
    quarter: string, // e.g. 2026-Q1
    userId: number,
  ) {
    const [yearStr, qStr] = quarter.split('-Q');
    const year = Number(yearStr);
    const q = Number(qStr);

    const startMonth = (q - 1) * 3 + 1;

    let totalWeeks = 0;

    /* ✅ SUM CALENDAR WEEKS PER MONTH */
    for (let i = 0; i < 3; i++) {
      const month = `${year}-${String(startMonth + i).padStart(2, '0')}`;

      const weeksResponse = await this.calendarService.getWeeksForMonth(
        month,
        userId,
      );

      totalWeeks += weeksResponse.items.length;
    }

    const totalMeetings = meetings.length;

    const meetingsWithPresales = meetings.filter(
      (m) => (m.preSalesOwners?.length ?? 0) > 0,
    ).length;

    const targetMeetings = totalWeeks * CONFIG.WEEKLY_TARGET;
    const targetPresales = totalWeeks * CONFIG.WEEKLY_PRESALES_TARGET;

    return {
      period: 'QUARTERLY',

      totals: {
        meetings: totalMeetings,
        meetingsWithPresales,
      },

      targets: {
        meetings: targetMeetings,
        presales: targetPresales,
        weeks: totalWeeks,
      },

      performance: {
        meetingAchievementRate: this.getRate(totalMeetings, targetMeetings),
        presalesAchievementRate: this.getRate(
          meetingsWithPresales,
          targetPresales,
        ),
      },

      deltas: {
        meetingDelta: totalMeetings - targetMeetings,
        presalesDelta: meetingsWithPresales - targetPresales,
      },
    };
  }

  /* ---------------------------------------------
     📅 YEARLY REPORT (FIXED ✅)
  ---------------------------------------------- */
  async buildYearlyReport(
    meetings: MeetingRow[],
    year: number,
    userId: number,
  ) {
    let totalWeeks = 0;

    /* ✅ SUM ALL MONTHS */
    for (let m = 1; m <= 12; m++) {
      const month = `${year}-${String(m).padStart(2, '0')}`;

      const weeksResponse = await this.calendarService.getWeeksForMonth(
        month,
        userId,
      );

      totalWeeks += weeksResponse.items.length;
    }

    const totalMeetings = meetings.length;

    const meetingsWithPresales = meetings.filter(
      (m) => (m.preSalesOwners?.length ?? 0) > 0,
    ).length;

    const targetMeetings = totalWeeks * CONFIG.WEEKLY_TARGET;
    const targetPresales = totalWeeks * CONFIG.WEEKLY_PRESALES_TARGET;

    return {
      period: 'YEARLY',

      totals: {
        meetings: totalMeetings,
        meetingsWithPresales,
      },

      targets: {
        meetings: targetMeetings,
        presales: targetPresales,
        weeks: totalWeeks,
      },

      performance: {
        meetingAchievementRate: this.getRate(totalMeetings, targetMeetings),
        presalesAchievementRate: this.getRate(
          meetingsWithPresales,
          targetPresales,
        ),
      },

      deltas: {
        meetingDelta: totalMeetings - targetMeetings,
        presalesDelta: meetingsWithPresales - targetPresales,
      },
    };
  }

  /* ---------------------------------------------
     🧮 HELPERS
  ---------------------------------------------- */
  private getRate(actual: number, target: number) {
    if (!target) return 0;
    return Math.round((actual / target) * 100);
  }
}
