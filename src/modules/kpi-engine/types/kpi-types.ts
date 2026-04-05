export type MeetingStatus = 'GOOD' | 'FAIR' | 'POOR';
export type WeeklyStatus = 'GOOD' | 'FAIR' | 'POOR' | 'EXCELLENT';

export interface MeetingRow {
  id: number;
  repName: string;
  customerName: string;
  primaryContact?: string | null;
  meetingPurpose?: string | null;
  meetingOutcome?: string | null;
  preSalesOwners?: PreSalesUser[] | null;

  createdAt?: Date | string;
}

interface PreSalesUser {
  id: number;
  firstName: string;
  lastName: string;
}

export interface MeetingFinding {
  meetingId: number;
  status: MeetingStatus;
  message: string;
}

export interface WeeklyFinding {
  status: WeeklyStatus;
  message: string;
}

export interface WeeklyResult {
  totalMeetings: number;
  score: number;
  status: WeeklyStatus;
  weeklyFindings: WeeklyFinding[];
  meetingFindings: MeetingFinding[];
}

export interface KpiFilters {
  month?: string; // YYYY-MM
  week?: string; // YYYY-WW
  quarter?: string; // YYYY-QN
}
