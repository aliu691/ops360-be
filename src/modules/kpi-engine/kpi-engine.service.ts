import { Injectable } from '@nestjs/common';
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
    repName: string,
    filters?: KpiFilters,
  ): Promise<WeeklyResult> {
    /**
     * ✅ IMPORTANT:
     * KPI MUST evaluate against ALL meetings,
     * never paginated data
     */
    const allMeetings = await this.meetingsService.getAllMeetingsByRep(
      repName,
      {
        month: filters?.month,
        week: filters?.week ? Number(filters.week) : undefined,
      },
    );

    if (!allMeetings || allMeetings.length === 0) {
      return this.emptyResult('No meetings found for this rep.');
    }

    let scopedMeetings = allMeetings;

    /* ------------------------------
       QUARTER FILTER (YYYY-QN)
       (Month & week already handled by DB)
    ------------------------------ */
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

    /**
     * ✅ Existing behavior preserved:
     * Evaluate latest batch (latest week in scope)
     */
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
