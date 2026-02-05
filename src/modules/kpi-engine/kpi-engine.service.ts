import { ForbiddenException, Injectable } from '@nestjs/common';
import { MeetingsService } from '../meetings/meetings.service';
import { MeetingEvaluator } from './evaluators/meeting-evaluator';
import { WeeklyEvaluator } from './evaluators/weekly-evaluator';
import { BatchPicker } from './evaluators/batch-picker';
import { MeetingRow, WeeklyResult, KpiFilters } from './types/kpi-types';
import { Meeting } from '../meetings/meetings.entity';
import { UsersService } from '../users/users.service';

@Injectable()
export class KpiEngineService {
  constructor(
    private readonly meetingsService: MeetingsService,
    private readonly usersService: UsersService,
  ) {}

  /**
   * KPI evaluation for a rep
   * Defaults to latest available week
   * Supports optional filters: month, week, quarter
   */
  //   async evaluateLatestWeekForRep(
  //     actor: {
  //       type: 'ADMIN' | 'USER';
  //       id: number;
  //       repName?: string;
  //     },
  //     repName: string,
  //     filters?: KpiFilters,
  //   ): Promise<WeeklyResult> {
  //     /* ------------------------------------------------
  //    🔐 ACCESS CONTROL (FINAL FIX)
  // ------------------------------------------------ */

  //     let effectiveRepName = repName;

  //     if (actor.type === 'USER') {
  //       // 🔑 USER identity is userId, NOT repName
  //       const userMeetings = await this.meetingsService.getAllMeetingsByUserId(
  //         actor.id,
  //         {
  //           month: filters?.month,
  //           week: filters?.week ? Number(filters.week) : undefined,
  //         },
  //       );

  //       if (!userMeetings.length) {
  //         throw new ForbiddenException('No KPI data available for this user');
  //       }

  //       // 🧠 Derive repName from actual data
  //       effectiveRepName = userMeetings[0].repName;
  //     }

  //     /* ------------------------------------------------
  //        DATA FETCH
  //     ------------------------------------------------ */

  //     const allMeetings = await this.meetingsService.getAllMeetingsByRep(
  //       actor,
  //       effectiveRepName,
  //       {
  //         month: filters?.month,
  //         week: filters?.week ? Number(filters.week) : undefined,
  //       },
  //     );

  //     if (!allMeetings.length) {
  //       return this.emptyResult('No meetings found for this rep.');
  //     }

  //     let scopedMeetings = allMeetings;

  //     /* ------------------------------------------------
  //        QUARTER FILTER
  //     ------------------------------------------------ */
  //     if (filters?.quarter) {
  //       const [yearStr, qStr] = filters.quarter.split('-Q');
  //       const year = Number(yearStr);
  //       const quarter = Number(qStr);

  //       scopedMeetings = scopedMeetings.filter((m) => {
  //         if (!m.createdAt) return false;
  //         const d = new Date(m.createdAt);
  //         const meetingQuarter = Math.floor(d.getMonth() / 3) + 1;
  //         return d.getFullYear() === year && meetingQuarter === quarter;
  //       });
  //     }

  //     if (!scopedMeetings.length) {
  //       return this.emptyResult('No meetings found for selected period.');
  //     }

  //     /* ------------------------------------------------
  //        KPI EVALUATION
  //     ------------------------------------------------ */
  //     const latestBatch = BatchPicker.pickLatestBatch(
  //       scopedMeetings as MeetingRow[],
  //     );

  //     const meetingFindings = latestBatch.map((m) =>
  //       MeetingEvaluator.evaluate(m),
  //     );

  //     const weekly = WeeklyEvaluator.computeScoreAndStatus(latestBatch);

  //     return {
  //       ...weekly,
  //       meetingFindings,
  //     };

  //     // ✅ TypeScript safety — logically unreachable
  //     // but required for static analysis
  //     return this.emptyResult('No KPI data available.');
  //   }

  /* --------------------------------
     Helpers
  -------------------------------- */

  private emptyResult(message: string): WeeklyResult {
    return {
      totalMeetings: 0,
      score: 0,
      status: 'POOR',
      weeklyFindings: [{ status: 'POOR', message }],
      meetingFindings: [],
    };
  }

  //new code:

  private evaluateMeetings(
    meetings: any[],
    filters?: KpiFilters,
  ): WeeklyResult {
    let scopedMeetings = meetings;

    if (filters?.quarter) {
      const [yearStr, qStr] = filters.quarter.split('-Q');
      const year = Number(yearStr);
      const quarter = Number(qStr);

      scopedMeetings = scopedMeetings.filter((m) => {
        const d = new Date(m.createdAt);
        return (
          d.getFullYear() === year &&
          Math.floor(d.getMonth() / 3) + 1 === quarter
        );
      });
    }

    if (!scopedMeetings.length) {
      return this.emptyResult('No meetings found for selected period.');
    }

    const latestBatch = BatchPicker.pickLatestBatch(scopedMeetings);
    const meetingFindings = latestBatch.map(MeetingEvaluator.evaluate);
    const weekly = WeeklyEvaluator.computeScoreAndStatus(latestBatch);

    return {
      ...weekly,
      meetingFindings,
    };
  }

  async evaluateForRep(
    actor: {
      type: 'ADMIN' | 'USER';
      id: number; // auth_identity.id
    },
    repName: string | null,
    filters?: KpiFilters,
  ): Promise<WeeklyResult> {
    /* ----------------------------------
       🧠 NORMALIZE FILTERS
    ---------------------------------- */
    const month =
      typeof filters?.month === 'string' && filters.month.trim()
        ? filters.month
        : undefined;

    const week =
      filters?.week !== undefined && !isNaN(Number(filters.week))
        ? Number(filters.week)
        : undefined;

    let meetings: Meeting[] = [];

    /* ----------------------------------
       🔐 ACCESS & DATA RESOLUTION (FIXED)
    ---------------------------------- */

    if (actor.type === 'USER') {
      // 🔑 Resolve REAL user from auth_identity
      const user = await this.usersService.findByAuthIdentityId(actor.id);

      if (!user) {
        return this.emptyResult('User account not found.');
      }

      meetings = await this.meetingsService.getAllMeetingsByUserId(user.id, {
        month,
        week,
      });
    } else {
      if (!repName) {
        throw new ForbiddenException('repName is required');
      }

      meetings = await this.meetingsService.getAllMeetingsByRep(repName, {
        month,
        week,
      });
    }

    if (!meetings.length) {
      return this.emptyResult('No meetings found for this period.');
    }

    /* ----------------------------------
       📆 QUARTER FILTER
    ---------------------------------- */
    if (filters?.quarter) {
      const [yearStr, qStr] = filters.quarter.split('-Q');
      const year = Number(yearStr);
      const quarter = Number(qStr);

      meetings = meetings.filter((m) => {
        const d = new Date(m.createdAt);
        const q = Math.floor(d.getMonth() / 3) + 1;
        return d.getFullYear() === year && q === quarter;
      });
    }

    if (!meetings.length) {
      return this.emptyResult('No meetings found for selected period.');
    }

    /* ----------------------------------
       📊 KPI EVALUATION
    ---------------------------------- */
    const latestBatch = BatchPicker.pickLatestBatch(meetings as MeetingRow[]);

    return {
      ...WeeklyEvaluator.computeScoreAndStatus(latestBatch),
      meetingFindings: latestBatch.map((m) => MeetingEvaluator.evaluate(m)),
    };
  }
}
