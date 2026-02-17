import { roleRegex } from 'src/utils/constants';
import { MeetingRow, WeeklyFinding, WeeklyStatus } from '../types/kpi-types';

/* ---------------------------------------------
   CONFIG — single source of truth
---------------------------------------------- */
const KPI_CONFIG = {
  REQUIRED_MEETINGS: 5,
  POINTS_PER_MEETING: 20,

  PENALTIES: {
    MISSING_MEETING: 20,
    MISSING_CONTACT: 10,
    MISSING_OUTCOME: 10,
    ROLE_ONLY_CONTACT: 10,
  },

  STATUS_THRESHOLDS: {
    GOOD: 70,
    FAIR: 45,
  },
};

export class WeeklyEvaluator {
  static computeScoreAndStatus(meetings: MeetingRow[]) {
    const MAX_MEETINGS = 5;
    const meetingsToScore = meetings.slice(0, MAX_MEETINGS);

    let score = 0;

    let missingOutcomeCount = 0;
    let missingContactCount = 0;
    let roleOnlyCount = 0;

    for (const m of meetingsToScore) {
      // 10 points for meeting existence
      score += 10;

      const outcomePresent = (m.meetingOutcome ?? '').trim().length > 0;
      const contact = (m.primaryContact ?? '').trim();

      if (outcomePresent) {
        score += 5;
      } else {
        missingOutcomeCount++;
      }

      if (!contact) {
        missingContactCount++;
      } else if (roleRegex.test(contact)) {
        roleOnlyCount++;
      } else {
        score += 5;
      }
    }

    score = Math.max(0, Math.min(100, score));

    // STATUS
    // STATUS
    let status: WeeklyStatus;
    if (score >= 70) status = 'GOOD';
    else if (score >= 45) status = 'FAIR';
    else status = 'POOR';

    /* ---------------------------------------------
   BUILD WEEKLY FINDINGS
---------------------------------------------- */
    const weeklyFindings: WeeklyFinding[] = [];

    const missedMeetings = Math.max(
      0,
      KPI_CONFIG.REQUIRED_MEETINGS - meetings.length,
    );

    if (missedMeetings > 0) {
      weeklyFindings.push({
        status: missedMeetings >= 2 ? 'POOR' : 'FAIR',
        message: `Missing ${missedMeetings} required meeting(s). Target is ${KPI_CONFIG.REQUIRED_MEETINGS}.`,
      });
    }

    if (missingOutcomeCount > 0) {
      weeklyFindings.push({
        status: 'FAIR',
        message: `${missingOutcomeCount} meeting(s) missing outcome.`,
      });
    }

    if (missingContactCount > 0) {
      weeklyFindings.push({
        status: 'FAIR',
        message: `${missingContactCount} meeting(s) missing primary contact.`,
      });
    }

    if (roleOnlyCount > 0) {
      weeklyFindings.push({
        status: 'FAIR',
        message: `${roleOnlyCount} meeting(s) used role/title instead of named contact.`,
      });
    }

    if (weeklyFindings.length === 0) {
      weeklyFindings.push({
        status: 'GOOD',
        message: 'All required meetings logged with complete details.',
      });
    }

    return {
      totalMeetings: meetings.length,
      score,
      status,
      weeklyFindings,
      counts: {
        missingOutcomeCount,
        missingContactCount,
        roleOnlyCount,
        missedMeetings,
      },
    };
  }
}
