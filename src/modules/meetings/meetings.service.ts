import { ForbiddenException, Injectable } from '@nestjs/common';
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

  async getMeetingsForActor(
    actor: {
      type: 'ADMIN' | 'USER';
      id: number;
      firstName?: string;
      lastName?: string;
    },
    page = 1,
    limit = 20,
    filters?: {
      month?: string;
      week?: number;
      repName?: string;
    },
  ) {
    const qb = this.meetingRepo
      .createQueryBuilder('m')
      .leftJoinAndSelect('m.user', 'user');

    /* -------------------------
       OWNERSHIP ENFORCEMENT
    ------------------------- */
    if (actor.type === 'USER') {
      qb.andWhere('m."userId" = :userId', {
        userId: actor.id,
      });
    }

    /* -------------------------
       FILTER GUARDS
    ------------------------- */
    if (filters?.repName && actor.type !== 'ADMIN') {
      throw new ForbiddenException('You are not allowed to filter by rep name');
    }

    /* -------------------------
       OPTIONAL FILTERS
    ------------------------- */
    if (filters?.repName) {
      qb.andWhere('m."repName" = :repName', {
        repName: filters.repName,
      });
    }

    if (filters?.month) {
      qb.andWhere('m."reportingMonth" = :month', {
        month: filters.month,
      });
    }

    if (filters?.week !== undefined) {
      qb.andWhere('m."reportingWeek" = :week', {
        week: filters.week,
      });
    }

    // ✅ ONLY REQUIRED FIX — do NOT quote here
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

  async getAllMeetingsByRep(
    actor: any,
    repName: string,
    filters?: {
      month?: string;
      week?: number;
    },
  ) {
    const qb = this.meetingRepo.createQueryBuilder('m');

    /* -------------------------
       OWNERSHIP ENFORCEMENT
    ------------------------- */
    if (actor.type === 'USER') {
      // ❌ Users cannot arbitrarily request repName
      throw new ForbiddenException('Not allowed');
    }

    // Admins only beyond this point
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
}
