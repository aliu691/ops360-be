import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Meeting } from './meetings.entity';

@Injectable()
export class MeetingsService {
  constructor(
    @InjectRepository(Meeting)
    private readonly meetingRepo: Repository<Meeting>,
  ) {}

  async saveMeetings(meetings: Partial<Meeting>[]) {
    const entities = this.meetingRepo.create(meetings);
    await this.meetingRepo.save(entities);
  }

  /**
   * Get meetings for a rep
   * ✅ Pagination
   * ✅ Optional reportingMonth + reportingWeek filters
   */
  async getMeetingsByRep(
    repName: string,
    page = 1,
    limit = 20,
    filters?: {
      month?: string; // YYYY-MM
      week?: number; // business week number
    },
  ) {
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 20;

    const qb = this.meetingRepo.createQueryBuilder('m');

    qb.where('m.repName = :repName', { repName });

    /* ------------------------------
       REPORTING MONTH FILTER
    ------------------------------ */
    if (filters?.month) {
      qb.andWhere('m.reportingMonth = :month', {
        month: filters.month,
      });
    }

    /* ------------------------------
       REPORTING WEEK FILTER
    ------------------------------ */
    if (filters?.week !== undefined) {
      qb.andWhere('m.reportingWeek = :week', {
        week: filters.week,
      });
    }

    qb.orderBy('m.createdAt', 'DESC')
      .skip((pageNum - 1) * limitNum)
      .take(limitNum);

    const [items, total] = await qb.getManyAndCount();

    return {
      success: true,
      message: 'Meetings retrieved successfully.',
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
      items,
    };
  }

  /**
   * ✅ NON-PAGINATED VERSION (for KPI engine)
   * KPI logic must always operate on full datasets
   */
  async getAllMeetingsByRep(
    repName: string,
    filters?: {
      month?: string;
      week?: number;
    },
  ) {
    const qb = this.meetingRepo.createQueryBuilder('m');

    qb.where('m.repName = :repName', { repName });

    if (filters?.month) {
      qb.andWhere('m.reportingMonth = :month', {
        month: filters.month,
      });
    }

    if (filters?.week !== undefined) {
      qb.andWhere('m.reportingWeek = :week', {
        week: filters.week,
      });
    }

    qb.orderBy('m.createdAt', 'DESC');

    return qb.getMany();
  }

  async getAllMeetings(
    page = 1,
    limit = 20,
    filters?: {
      month?: string;
      week?: number;
    },
  ) {
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 20;

    const qb = this.meetingRepo.createQueryBuilder('m');

    /* ------------------------------
       REPORTING MONTH FILTER
    ------------------------------ */
    if (filters?.month) {
      qb.andWhere('m.reportingMonth = :month', {
        month: filters.month,
      });
    }

    /* ------------------------------
       REPORTING WEEK FILTER
    ------------------------------ */
    if (filters?.week !== undefined) {
      qb.andWhere('m.reportingWeek = :week', {
        week: filters.week,
      });
    }

    qb.orderBy('m.createdAt', 'DESC')
      .skip((pageNum - 1) * limitNum)
      .take(limitNum);

    const [items, total] = await qb.getManyAndCount();

    return {
      success: true,
      message: 'Meetings retrieved successfully.',
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
      items,
    };
  }
}
