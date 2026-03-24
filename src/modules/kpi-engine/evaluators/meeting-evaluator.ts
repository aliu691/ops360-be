import { roleRegex } from 'src/utils/constants';
import { MeetingFinding, MeetingRow, MeetingStatus } from '../types/kpi-types';

export class MeetingEvaluator {
  // detect if primaryContact is a role/title instead of a name
  private static isRoleOnly(contact?: string | null): boolean {
    if (!contact) return false;
    return roleRegex.test(contact);
  }

  static evaluate(meeting: MeetingRow): MeetingFinding {
    const hasOutcome =
      meeting.meetingOutcome && meeting.meetingOutcome.trim().length > 0;

    const hasContact =
      meeting.primaryContact && meeting.primaryContact.trim().length > 0;

    /* ✅ NORMALIZE PRESALES (SAFE) */
    const preSalesOwners =
      meeting.preSalesOwners?.map((u: any) => ({
        id: u.id,
        firstName: u.firstName,
        lastName: u.lastName,
      })) || [];

    // Build a base wrapper so all results include meeting details
    const base = {
      meetingId: meeting.id,
      customerName: meeting.customerName,
      primaryContact: meeting.primaryContact,
      meetingPurpose: meeting.meetingPurpose,
      meetingOutcome: meeting.meetingOutcome,

      /* ✅ ADD THIS */
      preSalesOwners,
    };

    if (!hasOutcome) {
      return {
        ...base,
        status: 'POOR',
        message: 'Missing meeting outcome.',
      };
    }

    if (!hasContact) {
      return {
        ...base,
        status: 'POOR',
        message: 'Missing primary contact.',
      };
    }

    if (this.isRoleOnly(meeting.primaryContact)) {
      return {
        ...base,
        status: 'FAIR',
        message:
          'Primary contact appears to be a role/title rather than an individual name.',
      };
    }

    return {
      ...base,
      status: 'GOOD',
      message: 'Meeting looks good.',
    };
  }
}
