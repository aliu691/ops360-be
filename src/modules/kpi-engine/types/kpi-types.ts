export type MeetingStatus = 'GOOD' | 'FAIR' | 'FAIL';
export type WeeklyStatus = 'GOOD' | 'FAIR' | 'FAIL';

export interface MeetingRow {
  id: number;
  repName: string;
  customerName: string;
  primaryContact?: string | null;
  meetingPurpose?: string | null;
  meetingOutcome?: string | null;
  createdAt?: Date | string;
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
