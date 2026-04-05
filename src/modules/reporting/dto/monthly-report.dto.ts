export interface MonthlyReportResponse {
  period: 'MONTHLY';

  totals: {
    meetings: number;
    meetingsWithPresales: number;
  };

  targets: {
    meetings: number;
    presales: number;
    weeks: number;
  };

  performance: {
    meetingAchievementRate: number;
    presalesAchievementRate: number;
  };

  deltas: {
    meetingDelta: number;
    presalesDelta: number;
  };

  analytics: {
    mostVisitedClient: string | null;
    mostVisits: number;
    uniqueClients: number;
    clientBreakdown: {
      client: string;
      meetings: number;
    }[];
  };

  meetings: {
    id: number;
    customerName: string;
    primaryContact?: string | null;
    meetingPurpose?: string | null;
    meetingOutcome?: string | null;
    preSalesOwners: {
      id: number;
      firstName: string;
      lastName: string;
    }[];
    reportingWeek: number;
    weekLabel: string;
  }[];
}
