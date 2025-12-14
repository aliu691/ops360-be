import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Meeting } from '../meetings/meetings.entity';

@Injectable()
export class FiltersService {
  constructor(
    @InjectRepository(Meeting)
    private readonly meetingRepo: Repository<Meeting>,
  ) {}

  /* -----------------------------------------
     MONTHS (from reportingMonth)
     e.g. "2025-11", "2025-12"
  ------------------------------------------*/
  async getAvailableMonths() {
    const rows = await this.meetingRepo
      .createQueryBuilder('m')
      .select('DISTINCT m.reportingMonth', 'month')
      .where('m.reportingMonth IS NOT NULL')
      .orderBy('month', 'DESC')
      .getRawMany();

    return {
      success: true,
      message: 'Available months retrieved successfully.',
      items: rows.map((r) => r.month),
    };
  }

  /* -----------------------------------------
     WEEKS (scoped to reportingMonth)
     Uses reportingWeek (business week)
  ------------------------------------------*/
  async getWeeksForMonth(month: string) {
    if (!month) {
      throw new BadRequestException('Month is required (YYYY-MM)');
    }

    const rows = await this.meetingRepo
      .createQueryBuilder('m')
      .select('DISTINCT m.reportingWeek', 'week')
      .where('m.reportingMonth = :month', { month })
      .andWhere('m.reportingWeek IS NOT NULL')
      .orderBy('week', 'ASC')
      .getRawMany();

    const [year] = month.split('-').map(Number);

    const items = rows.map((r) => {
      const week = Number(r.week);

      const startDate = this.getStartOfWeek(year, week);
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);

      return {
        week,
        label: `Week ${week} (${this.formatDate(startDate)} – ${this.formatDate(
          endDate,
        )})`,
        startDate,
        endDate,
      };
    });

    return {
      success: true,
      message: `Weeks for ${month} retrieved successfully.`,
      items,
    };
  }

  /* -----------------------------------------
     QUARTERS (from reportingMonth)
     Q1–Q4 derived from month value
  ------------------------------------------*/
  async getAvailableQuarters() {
    const rows = await this.meetingRepo
      .createQueryBuilder('m')
      .select('DISTINCT m.reportingMonth', 'month')
      .where('m.reportingMonth IS NOT NULL')
      .getRawMany();

    const quarters = new Map<string, string>();

    for (const r of rows) {
      const [year, monthStr] = r.month.split('-').map(Number);
      const quarter = Math.floor((monthStr - 1) / 3) + 1;

      const value = `${year}-Q${quarter}`;
      const label = `Q${quarter} ${year}`;

      quarters.set(value, label);
    }

    return {
      success: true,
      message: 'Available quarters retrieved successfully.',
      items: Array.from(quarters.entries()).map(([value, label]) => ({
        value,
        label,
      })),
    };
  }

  /* -----------------------------------------
     Helpers
  ------------------------------------------*/
  private getStartOfWeek(year: number, week: number): Date {
    const jan4 = new Date(year, 0, 4);
    const dayOfWeek = jan4.getDay() || 7;
    const mondayOfWeek1 = new Date(jan4);
    mondayOfWeek1.setDate(jan4.getDate() - dayOfWeek + 1);

    const result = new Date(mondayOfWeek1);
    result.setDate(mondayOfWeek1.getDate() + (week - 1) * 7);
    return result;
  }

  private formatDate(date: Date): string {
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
    });
  }
}
