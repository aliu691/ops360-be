import { MeetingRow, WeeklyFinding, WeeklyStatus } from '../types/kpi-types';

export class WeeklyEvaluator {
  static computeScoreAndStatus(meetings: MeetingRow[]) {
    const total = meetings.length;

    // 1. COMPUTE QUALITY SCORE
    let qualityScore = 100;
    let missingOutcomeCount = 0;
    let missingContactCount = 0;
    let roleOnlyCount = 0;

    const roleRegex =
      /(director|manager|officer|staff|engineer|consultant|lead|coordinator|head|administrator|ceo|cto|cfo|vp|vice|principal)/i;

    for (const m of meetings) {
      const outcome = (m.meetingOutcome ?? '').trim().length > 0;
      const contact = (m.primaryContact ?? '').trim().length > 0;

      if (!outcome) missingOutcomeCount++;
      if (!contact) missingContactCount++;
      else if (roleRegex.test(m.primaryContact!)) roleOnlyCount++;
    }

    // Quality deductions
    qualityScore -= missingOutcomeCount * 10;
    qualityScore -= missingContactCount * 10;
    qualityScore -= roleOnlyCount * 5;

    qualityScore = Math.max(0, Math.min(100, qualityScore));

    // 2. COMPUTE ACTIVITY SCORE
    const idealMeetings = 8;

    let activityScore = 0;
    if (total >= idealMeetings) {
      activityScore = 100;
    } else {
      activityScore = Math.round((total / idealMeetings) * 100);
    }

    activityScore = Math.max(0, Math.min(100, activityScore));

    // 3. COMBINE INTO FINAL SCORE
    const activityWeight = 0.6;
    const qualityWeight = 0.4;

    let finalScore = Math.round(
      activityScore * activityWeight + qualityScore * qualityWeight,
    );

    finalScore = Math.max(0, Math.min(100, finalScore));

    // 4. WEEKLY FINDINGS (MESSAGING)
    const weeklyFindings: WeeklyFinding[] = [];

    if (total < 5) {
      weeklyFindings.push({
        status: total < 3 ? 'FAIL' : 'FAIR',
        message: `Weekly activity below required minimum (5). Logged ${total}.`,
      });
    }

    if (missingOutcomeCount > 0) {
      weeklyFindings.push({
        status:
          missingOutcomeCount / Math.max(1, total) > 0.3 ? 'FAIL' : 'FAIR',
        message: `${missingOutcomeCount} meeting(s) missing meetingOutcome.`,
      });
    }

    if (missingContactCount > 0) {
      weeklyFindings.push({
        status:
          missingContactCount / Math.max(1, total) > 0.3 ? 'FAIL' : 'FAIR',
        message: `${missingContactCount} meeting(s) missing primaryContact.`,
      });
    }
    // 5. DETERMINE FINAL STATUS
    let status: WeeklyStatus;

    // Hard fail if activity extremely low
    if (total < 3) {
      status = 'FAIL';
    } else {
      // Otherwise score determines status
      if (finalScore >= 65) status = 'GOOD';
      else if (finalScore >= 45) status = 'FAIR';
      else status = 'FAIL';
    }

    // 6. RETURN RESULT

    return {
      totalMeetings: total,
      score: finalScore,
      status,
      weeklyFindings,
      counts: {
        missingOutcomeCount,
        missingContactCount,
        roleOnlyCount,
      },
    };
  }
}
