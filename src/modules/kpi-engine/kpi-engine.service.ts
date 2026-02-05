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

  async evaluateForRep(
    actor: {
      type: 'ADMIN' | 'USER';
      id: number; // ✅ users.id
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
       🔐 ACCESS & DATA RESOLUTION (FINAL)
    ---------------------------------- */

    if (actor.type === 'USER') {
      // ✅ USER → STRICTLY by userId
      meetings = await this.meetingsService.getAllMeetingsByUserId(actor.id, {
        month,
        week,
      });
    } else {
      // 👮 ADMIN / SUPER_ADMIN → by repName
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
}
