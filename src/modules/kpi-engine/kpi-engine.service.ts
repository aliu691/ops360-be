import { ForbiddenException, Injectable } from '@nestjs/common';
import { MeetingsService } from '../meetings/meetings.service';
import { MeetingEvaluator } from './evaluators/meeting-evaluator';
import { WeeklyEvaluator } from './evaluators/weekly-evaluator';
import { BatchPicker } from './evaluators/batch-picker';
import { MeetingRow, WeeklyResult, KpiFilters } from './types/kpi-types';

@Injectable()
export class KpiEngineService {
  constructor(private readonly meetingsService: MeetingsService) {}

  /**
   * KPI evaluation for a rep
   * Defaults to latest available week
   * Supports optional filters: month, week, quarter
   */
  async evaluateLatestWeekForRep(
    actor: {
      type: 'ADMIN' | 'USER';
      id: number;
      repName?: string;
    },
    repName: string,
    filters?: KpiFilters,
  ): Promise<WeeklyResult> {
    /* ------------------------------------------------
       🔐 ACCESS CONTROL
    ------------------------------------------------ */

    if (actor.type === 'USER') {
      const actorRepName = `${actor.repName}`;

      if (actorRepName !== repName) {
        throw new ForbiddenException(
          'You are not allowed to view KPI data for other reps',
        );
      }
    }

    /* ------------------------------------------------
       DATA FETCH
    ------------------------------------------------ */

    const allMeetings = await this.meetingsService.getAllMeetingsByRep(
      actor,
      repName,
      {
        month: filters?.month,
        week: filters?.week ? Number(filters.week) : undefined,
      },
    );

    if (!allMeetings.length) {
      return this.emptyResult('No meetings found for this rep.');
    }

    let scopedMeetings = allMeetings;

    /* ------------------------------------------------
       QUARTER FILTER
    ------------------------------------------------ */
    if (filters?.quarter) {
      const [yearStr, qStr] = filters.quarter.split('-Q');
      const year = Number(yearStr);
      const quarter = Number(qStr);

      scopedMeetings = scopedMeetings.filter((m) => {
        if (!m.createdAt) return false;
        const d = new Date(m.createdAt);
        const meetingQuarter = Math.floor(d.getMonth() / 3) + 1;
        return d.getFullYear() === year && meetingQuarter === quarter;
      });
    }

    if (!scopedMeetings.length) {
      return this.emptyResult('No meetings found for selected period.');
    }

    /* ------------------------------------------------
       KPI EVALUATION
    ------------------------------------------------ */
    const latestBatch = BatchPicker.pickLatestBatch(
      scopedMeetings as MeetingRow[],
    );

    const meetingFindings = latestBatch.map((m) =>
      MeetingEvaluator.evaluate(m),
    );

    const weekly = WeeklyEvaluator.computeScoreAndStatus(latestBatch);

    return {
      ...weekly,
      meetingFindings,
    };

    // ✅ TypeScript safety — logically unreachable
    // but required for static analysis
    return this.emptyResult('No KPI data available.');
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
