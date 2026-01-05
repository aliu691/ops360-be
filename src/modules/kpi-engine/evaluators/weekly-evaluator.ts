import { roleRegex } from 'src/utils/constants';
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
    ROLE_ONLY_CONTACT: 15, // ⬅ stronger signal
  },
};

export class WeeklyEvaluator {
  static computeScoreAndStatus(meetings: MeetingRow[]) {
    const total = meetings.length;

    /* ---------------------------------------------
       1. QUALITY ANALYSIS
    ---------------------------------------------- */
    let qualityScore = 100;

    let missingOutcomeCount = 0;
    let missingContactCount = 0;
    let roleOnlyCount = 0;

    let hasCriticalQualityIssue = false;

    for (const m of meetings) {
      const outcomePresent = (m.meetingOutcome ?? '').trim().length > 0;
      const contact = (m.primaryContact ?? '').trim();

      if (!outcomePresent) {
        missingOutcomeCount++;
        hasCriticalQualityIssue = true;
      }

      if (!contact) {
        missingContactCount++;
        hasCriticalQualityIssue = true;
      } else if (roleRegex.test(contact)) {
        roleOnlyCount++;
        hasCriticalQualityIssue = true; // 🚫 cannot be GOOD
      }
    }

    qualityScore -=
      missingOutcomeCount * KPI_CONFIG.QUALITY_PENALTIES.MISSING_OUTCOME;
    qualityScore -=
      missingContactCount * KPI_CONFIG.QUALITY_PENALTIES.MISSING_CONTACT;
    qualityScore -=
      roleOnlyCount * KPI_CONFIG.QUALITY_PENALTIES.ROLE_ONLY_CONTACT;

    qualityScore = Math.max(0, Math.min(100, qualityScore));

    /* ---------------------------------------------
       2. ACTIVITY SCORE
    ---------------------------------------------- */
    let activityScore =
      total >= KPI_CONFIG.IDEAL_MEETINGS
        ? 100
        : Math.round((total / KPI_CONFIG.IDEAL_MEETINGS) * 100);

    activityScore = Math.max(0, Math.min(100, activityScore));

    /* ---------------------------------------------
       3. BASE SCORE
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
       5. WEEKLY FINDINGS (EXPLANATORY)
    ---------------------------------------------- */
    const weeklyFindings: WeeklyFinding[] = [];

    if (missedMeetings > 0) {
      weeklyFindings.push({
        status: missedMeetings >= 3 ? 'POOR' : 'FAIR',
        message: `Below minimum activity (${KPI_CONFIG.MIN_MEETINGS}). Logged ${total} meeting(s).`,
      });
    }

    if (missingOutcomeCount > 0) {
      weeklyFindings.push({
        status:
          missingOutcomeCount / Math.max(1, total) > 0.3 ? 'POOR' : 'FAIR',
        message: `${missingOutcomeCount} meeting(s) missing outcomes.`,
      });
    }

    if (missingContactCount > 0) {
      weeklyFindings.push({
        status:
          missingContactCount / Math.max(1, total) > 0.3 ? 'POOR' : 'FAIR',
        message: `${missingContactCount} meeting(s) missing primary contact.`,
      });
    }

    if (roleOnlyCount > 0) {
      weeklyFindings.push({
        status: 'FAIR',
        message: `${roleOnlyCount} meeting(s) used role-only contacts (not a person).`,
      });
    }

    /* ---------------------------------------------
       6. FINAL STATUS (NO CONTRADICTIONS)
    ---------------------------------------------- */
    let status: WeeklyStatus;

    // 🚨 Absolute failure conditions
    if (total < 3) {
      status = 'POOR';
    }
    // 🚫 Quality issues block GOOD no matter the score
    else if (hasCriticalQualityIssue) {
      status =
        finalScore >= KPI_CONFIG.STATUS_THRESHOLDS.FAIR ? 'FAIR' : 'POOR';
    }
    // ✅ Clean data → score-based
    else {
      if (finalScore >= KPI_CONFIG.STATUS_THRESHOLDS.GOOD) status = 'GOOD';
      else if (finalScore >= KPI_CONFIG.STATUS_THRESHOLDS.FAIR) status = 'FAIR';
      else status = 'POOR';
    }

    /* ---------------------------------------------
       7. RETURN
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
