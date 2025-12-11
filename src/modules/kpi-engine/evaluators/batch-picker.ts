import { MeetingRow } from '../types/kpi-types';

export class BatchPicker {
  static pickLatestBatch(meetings: MeetingRow[]): MeetingRow[] {
    if (!meetings || meetings.length === 0) return [];

    const groups = new Map<number, MeetingRow[]>();

    for (const m of meetings) {
      const created = m.createdAt ? new Date(m.createdAt) : new Date(0);
      const key = created.getTime();
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(m);
    }

    const latestKey = Array.from(groups.keys()).sort((a, b) => b - a)[0];
    return groups.get(latestKey) || [];
  }
}
