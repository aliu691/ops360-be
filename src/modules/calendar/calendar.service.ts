import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Meeting } from '../meetings/meetings.entity';

@Injectable()
export class CalendarService {
  constructor(
    @InjectRepository(Meeting)
    private readonly meetingRepo: Repository<Meeting>,
  ) {}

  /* --------------------------------
     MONTHS (calendar-based)
  -------------------------------- */
  getMonths() {
    const now = new Date();
    const months: string[] = [];

    for (let i = -1; i <= 1; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      months.push(d.toISOString().slice(0, 7));
    }

    return {
      success: true,
      items: months,
    };
  }

  /* --------------------------------
     WEEKS FOR MONTH (PER USER)
  -------------------------------- */
  async getWeeksForMonth(month: string, userId: number) {
    if (!userId) {
      throw new BadRequestException('userId is required');
    }

    const [year, monthIndex] = month.split('-').map(Number);

    const firstDay = new Date(year, monthIndex - 1, 1);
    const lastDay = new Date(year, monthIndex, 0);

    const usedWeeksRaw = await this.meetingRepo
      .createQueryBuilder('m')
      .select('DISTINCT m.reportingWeek', 'week')
      .where('m.reportingMonth = :month', { month })
      .andWhere('m.userId = :userId', { userId })
      .getRawMany();

    const usedWeeks = new Set<number>(usedWeeksRaw.map((r) => Number(r.week)));

    const weeks: {
      week: number;
      label: string;
      startDate: Date;
      endDate: Date;
      hasData: boolean;
    }[] = [];

    let cursor = this.getStartOfWeek(firstDay);

    while (cursor <= lastDay) {
      const start = new Date(cursor);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);

      // ✅ WEEK BELONGS TO MONTH OF ITS START DATE
      if (start.getMonth() === monthIndex - 1) {
        const week = this.getISOWeek(start);

        weeks.push({
          week,
          label: `Week ${week} (${this.format(start)} – ${this.format(end)})`,
          startDate: start,
          endDate: end,
          hasData: usedWeeks.has(week),
        });
      }

      cursor.setDate(cursor.getDate() + 7);
    }

    return {
      success: true,
      items: weeks,
    };
  }

  /* --------------------------------
     HELPERS
  -------------------------------- */

  private getISOWeek(date: Date): number {
    const d = new Date(
      Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
    );

    const dayNum = d.getUTCDay() || 7;

    d.setUTCDate(d.getUTCDate() + 4 - dayNum);

    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));

    return Math.ceil(((+d - +yearStart) / 86400000 + 1) / 7);
  }

  private getStartOfWeek(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay() || 7;
    d.setDate(d.getDate() - day + 1); // Monday
    return d;
  }

  private format(d: Date): string {
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
    });
  }
}
