import { MeetingRow, WeeklyFinding, WeeklyStatus } from '../types/kpi-types';

/* ---------------------------------------------
   CONFIG — single source of truth
---------------------------------------------- */
const KPI_CONFIG = {
  MIN_MEETINGS: 5,
  IDEAL_MEETINGS: 8,

  PENALTY_PER_MISSED_MEETING: 10,

  ACTIVITY_WEIGHT: 0.6,
  QUALITY_WEIGHT: 0.4,

  STATUS_THRESHOLDS: {
    GOOD: 70,
    FAIR: 45,
  },

  QUALITY_PENALTIES: {
    MISSING_OUTCOME: 10,
    MISSING_CONTACT: 10,
    ROLE_ONLY_CONTACT: 5,
  },
};

export class WeeklyEvaluator {
  static computeScoreAndStatus(meetings: MeetingRow[]) {
    const total = meetings.length;

    /* ---------------------------------------------
       1. QUALITY SCORE
    ---------------------------------------------- */
    let qualityScore = 100;

    let missingOutcomeCount = 0;
    let missingContactCount = 0;
    let roleOnlyCount = 0;

    const roleRegex =
      /(director|manager|officer|staff|engineer|consultant|lead|coordinator|head|administrator|ceo|cto|cfo|vp|vice|principal)/i;

    for (const m of meetings) {
      const outcomePresent = (m.meetingOutcome ?? '').trim().length > 0;
      const contactPresent = (m.primaryContact ?? '').trim().length > 0;

      if (!outcomePresent) missingOutcomeCount++;
      if (!contactPresent) missingContactCount++;
      else if (roleRegex.test(m.primaryContact!)) roleOnlyCount++;
    }

    qualityScore -=
      missingOutcomeCount * KPI_CONFIG.QUALITY_PENALTIES.MISSING_OUTCOME;
    qualityScore -=
      missingContactCount * KPI_CONFIG.QUALITY_PENALTIES.MISSING_CONTACT;
    qualityScore -=
      roleOnlyCount * KPI_CONFIG.QUALITY_PENALTIES.ROLE_ONLY_CONTACT;

    qualityScore = Math.max(0, Math.min(100, qualityScore));

    /* ---------------------------------------------
       2. ACTIVITY SCORE (progress to ideal)
    ---------------------------------------------- */
    let activityScore = 0;

    if (total >= KPI_CONFIG.IDEAL_MEETINGS) {
      activityScore = 100;
    } else {
      activityScore = Math.round((total / KPI_CONFIG.IDEAL_MEETINGS) * 100);
    }

    activityScore = Math.max(0, Math.min(100, activityScore));

    /* ---------------------------------------------
       3. COMBINE SCORES
    ---------------------------------------------- */
    let finalScore = Math.round(
      activityScore * KPI_CONFIG.ACTIVITY_WEIGHT +
        qualityScore * KPI_CONFIG.QUALITY_WEIGHT,
    );

    /* ---------------------------------------------
       4. ACTIVITY DEFICIT PENALTY
    ---------------------------------------------- */
    const missedMeetings = Math.max(0, KPI_CONFIG.MIN_MEETINGS - total);

    const activityPenalty =
      missedMeetings * KPI_CONFIG.PENALTY_PER_MISSED_MEETING;

    finalScore -= activityPenalty;
    finalScore = Math.max(0, Math.min(100, finalScore));

    /* ---------------------------------------------
       5. WEEKLY FINDINGS
    ---------------------------------------------- */
    const weeklyFindings: WeeklyFinding[] = [];

    if (missedMeetings > 0) {
      weeklyFindings.push({
        status: missedMeetings >= 3 ? 'FAIL' : 'FAIR',
        message: `Weekly activity below minimum (${KPI_CONFIG.MIN_MEETINGS}). Logged ${total} meeting(s).`,
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

    /* ---------------------------------------------
       6. FINAL STATUS (matches UI)
    ---------------------------------------------- */
    let status: WeeklyStatus;

    if (finalScore >= KPI_CONFIG.STATUS_THRESHOLDS.GOOD) {
      status = 'GOOD';
    } else if (finalScore >= KPI_CONFIG.STATUS_THRESHOLDS.FAIR) {
      status = 'FAIR';
    } else {
      status = 'FAIL';
    }

    /* ---------------------------------------------
       7. RETURN RESULT
    ---------------------------------------------- */
    return {
      totalMeetings: total,
      score: finalScore,
      status,
      weeklyFindings,
      counts: {
        missingOutcomeCount,
        missingContactCount,
        roleOnlyCount,
        missedMeetings,
        activityPenalty,
      },
    };
  }
}
