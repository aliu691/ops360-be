import { MeetingFinding, MeetingRow, MeetingStatus } from '../types/kpi-types';

export class MeetingEvaluator {
  // detect if primaryContact is a role/title instead of a name
  private static isRoleOnly(contact?: string | null): boolean {
    if (!contact) return false;
    const roleRegex =
      /(director|manager|officer|staff|engineer|consultant|lead|coordinator|head|administrator|ceo|cto|cfo|vp|vice|principal)/i;
    return roleRegex.test(contact);
  }

  static evaluate(meeting: MeetingRow): MeetingFinding {
    const hasOutcome =
      meeting.meetingOutcome && meeting.meetingOutcome.trim().length > 0;

    const hasContact =
      meeting.primaryContact && meeting.primaryContact.trim().length > 0;

    if (!hasOutcome) {
      return {
        meetingId: meeting.id,
        status: 'FAIL',
        message: 'Missing meeting outcome.',
      };
    }

    if (!hasContact) {
      return {
        meetingId: meeting.id,
        status: 'FAIL',
        message: 'Missing primary contact.',
      };
    }

    if (this.isRoleOnly(meeting.primaryContact)) {
      return {
        meetingId: meeting.id,
        status: 'FAIR',
        message:
          'Primary contact appears to be a role/title rather than an individual name.',
      };
    }

    return {
      meetingId: meeting.id,
      status: 'GOOD',
      message: 'Meeting looks good.',
    };
  }
}
