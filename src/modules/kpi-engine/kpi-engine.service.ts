import { Injectable } from '@nestjs/common';
import { MeetingsService } from '../meetings/meetings.service';
import { MeetingEvaluator } from './evaluators/meeting-evaluator';
import { WeeklyEvaluator } from './evaluators/weekly-evaluator';
import { BatchPicker } from './evaluators/batch-picker';
import { MeetingRow, WeeklyResult } from './types/kpi-types';

@Injectable()
export class KpiEngineService {
  constructor(private readonly meetingsService: MeetingsService) {}

  async evaluateLatestWeekForRep(repName: string): Promise<WeeklyResult> {
    const allMeetings = await this.meetingsService.getMeetingsByRep(repName);

    if (!allMeetings || allMeetings.length === 0) {
      return {
        totalMeetings: 0,
        score: 0,
        status: 'FAIL',
        weeklyFindings: [
          { status: 'FAIL', message: 'No meetings found for this rep.' },
        ],
        meetingFindings: [],
      };
    }

    const latestBatch = BatchPicker.pickLatestBatch(
      allMeetings as MeetingRow[],
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
}
