import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Meeting } from './meetings.entity';
import { ConflictException } from '@nestjs/common';

@Injectable()
export class MeetingsService {
  constructor(
    @InjectRepository(Meeting)
    private readonly meetingRepo: Repository<Meeting>,
  ) {}

  async saveMeetings(meetings: Partial<Meeting>[]) {
    if (!meetings.length) return;

    /* ------------------------------------------------
       0️⃣ Hard validation (must have user context)
    ------------------------------------------------ */
    const invalid = meetings.find(
      (m) => !m.userId || !m.reportingMonth || m.reportingWeek === undefined,
    );

    if (invalid) {
      throw new Error(
        'userId, reportingMonth and reportingWeek are required for all meetings',
      );
    }

    const { userId, reportingMonth, reportingWeek } = meetings[0];

    /* ------------------------------------------------
       1️⃣ Prevent duplicate uploads PER USER
    ------------------------------------------------ */
    const existing = await this.meetingRepo.findOne({
      where: {
        userId,
        reportingMonth,
        reportingWeek,
      },
      select: ['id'],
    });

    if (existing) {
      throw new ConflictException(
        `User already uploaded meetings for week ${reportingWeek} (${reportingMonth}).`,
      );
    }

    /* ------------------------------------------------
       2️⃣ Persist meetings
    ------------------------------------------------ */
    const entities = this.meetingRepo.create(meetings);
    await this.meetingRepo.save(entities);
  }

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

  //new function
  async getMeetingsForActor(
    actor: any,
    page = 1,
    limit = 20,
    filters?: {
      month?: string;
      week?: number;
      repName?: string;
    },
  ) {
    console.log(actor);
    const qb = this.meetingRepo
      .createQueryBuilder('m')
      .leftJoinAndSelect('m.user', 'user');

    /* -------------------------
       OWNERSHIP ENFORCEMENT
    ------------------------- */
    if (actor.type === 'USER') {
      qb.andWhere(`(m."userId" = :userId OR m."repName" = :repName)`, {
        userId: actor.id,
        repName: `${actor.firstName} ${actor.lastName}`,
      });
    }

    /* -------------------------
       OPTIONAL FILTERS
    ------------------------- */

    // ✅ repName ONLY for admins
    if (filters?.repName && actor.type === 'ADMIN') {
      qb.andWhere('m.repName = :repName', { repName: filters.repName });
    }

    if (filters?.month) {
      qb.andWhere('m.reportingMonth = :month', { month: filters.month });
    }

    if (filters?.week !== undefined) {
      qb.andWhere('m.reportingWeek = :week', { week: filters.week });
    }

    qb.orderBy('m.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();

    return {
      success: true,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
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
