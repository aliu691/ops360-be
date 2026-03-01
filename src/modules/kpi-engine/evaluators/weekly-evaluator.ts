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

/* ---------------------------------------------
   CONTACT VALIDATION HELPERS
---------------------------------------------- */

// Strict role detection (safe — no substring traps like "it")

function normalizeContact(input: string): string {
  return input.trim().replace(/\s+/g, ' ').replace(/\r?\n/g, '');
}

function stripPrefixes(name: string): string {
  return name.replace(/^(mr|mrs|miss|dr|engr|prof)\.? /i, '');
}

function isRoleOnlyContact(name: string): boolean {
  const cleaned = stripPrefixes(name);

  if (!cleaned) return false;

  if (roleRegex.test(cleaned)) {
    return true;
  }

  return false;
}

/* ---------------------------------------------
   WEEKLY EVALUATOR
---------------------------------------------- */

export class WeeklyEvaluator {
  static computeScoreAndStatus(meetings: MeetingRow[]) {
    const MAX_MEETINGS = KPI_CONFIG.REQUIRED_MEETINGS;
    const meetingsToScore = meetings.slice(0, MAX_MEETINGS);

    let score = 0;

    let missingOutcomeCount = 0;
    let missingContactCount = 0;
    let roleOnlyCount = 0;

    /* ---------------------------------------------
       SCORE MEETINGS
    ---------------------------------------------- */
    for (const m of meetingsToScore) {
      // 10 points for meeting existence
      score += 10;

      /* ---------------------------
         OUTCOME CHECK
      ---------------------------- */
      const outcomePresent = (m.meetingOutcome ?? '').trim().length > 0;

      if (outcomePresent) {
        score += 5;
      } else {
        missingOutcomeCount++;
      }

      /* ---------------------------
         CONTACT CHECK (SMART)
      ---------------------------- */
      const rawContact = m.primaryContact ?? '';
      const contact = normalizeContact(rawContact);

      if (!contact) {
        missingContactCount++;
      } else if (isRoleOnlyContact(contact)) {
        roleOnlyCount++;
      } else {
        score += 5;
      }
    }

    score = Math.max(0, Math.min(100, score));

    /* ---------------------------------------------
       STATUS CALCULATION
    ---------------------------------------------- */
    let status: WeeklyStatus;

    if (score >= KPI_CONFIG.STATUS_THRESHOLDS.GOOD) {
      status = 'GOOD';
    } else if (score >= KPI_CONFIG.STATUS_THRESHOLDS.FAIR) {
      status = 'FAIR';
    } else {
      status = 'POOR';
    }

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

    /* ---------------------------------------------
       RETURN RESULT
    ---------------------------------------------- */
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
