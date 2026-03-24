import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Meeting } from './meetings.entity';
import { ConflictException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { AuditService } from '../audit-logs/audit.service';
import { AuditAction } from '../audit-logs/audit-actions';

@Injectable()
export class MeetingsService {
  constructor(
    @InjectRepository(Meeting)
    private readonly meetingRepo: Repository<Meeting>,

    private readonly usersService: UsersService,

    private readonly auditService: AuditService,
  ) {}

  async saveMeetings(meetings: Partial<Meeting>[]) {
    if (!meetings.length) return;

    /* ------------------------------------------------ */
    const invalid = meetings.find(
      (m) => !m.userId || !m.reportingMonth || m.reportingWeek === undefined,
    );

    if (invalid) {
      throw new Error(
        'userId, reportingMonth and reportingWeek are required for all meetings',
      );
    }

    const { userId, reportingMonth, reportingWeek } = meetings[0];

    /* ------------------------------------------------ */
    const existing = await this.meetingRepo.findOne({
      where: { userId, reportingMonth, reportingWeek },
      select: ['id'],
    });

    if (existing) {
      throw new ConflictException(
        `User already uploaded meetings for week ${reportingWeek} (${reportingMonth}).`,
      );
    }

    /* ------------------------------------------------ */
    // 1️⃣ Save base meetings first
    const baseEntities = meetings.map((m) =>
      this.meetingRepo.create({
        userId: m.userId,
        repName: m.repName,
        customerName: m.customerName,
        primaryContact: m.primaryContact,
        meetingPurpose: m.meetingPurpose,
        meetingOutcome: m.meetingOutcome,
        reportingMonth: m.reportingMonth,
        reportingWeek: m.reportingWeek,
      }),
    );

    const savedMeetings = await this.meetingRepo.save(baseEntities);

    /* ------------------------------------------------ */
    // 2️⃣ Attach presales (SAFE WAY)
    for (let i = 0; i < savedMeetings.length; i++) {
      const meeting = savedMeetings[i];
      const owners = meetings[i].preSalesOwners;

      if (owners && owners.length > 0) {
        await this.meetingRepo
          .createQueryBuilder()
          .relation(Meeting, 'preSalesOwners')
          .of(meeting.id)
          .add(owners.map((o) => o.id));
      }
    }
  }

  async getMeetingsForActor(
    actor: { type: 'ADMIN' | 'USER'; id: number },
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
      .leftJoinAndSelect('m.user', 'user')
      .leftJoinAndSelect('m.preSalesOwners', 'preSalesOwners');

    /* 🔐 USER OWNERSHIP — NOW CORRECT */
    if (actor.type === 'USER') {
      qb.where('m."userId" = :userId', {
        userId: actor.id, // ✅ users.id == meeting.userId
      });
    }

    /* 👮 ADMIN FILTERING */
    if (actor.type === 'ADMIN' && filters?.repName) {
      qb.andWhere('m."repName" = :repName', {
        repName: filters.repName,
      });
    }

    if (filters?.month) {
      qb.andWhere('m."reportingMonth" = :month', { month: filters.month });
    }

    if (filters?.week !== undefined) {
      qb.andWhere('m."reportingWeek" = :week', { week: filters.week });
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

  async getAllMeetingsByRep(
    repName: string,
    filters?: {
      month?: string;
      week?: number;
    },
  ) {
    const qb = this.meetingRepo
      .createQueryBuilder('m')
      .leftJoinAndSelect('m.preSalesOwners', 'preSalesOwners') // ✅ ADD THIS
      .where('m.repName = :repName', { repName });

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

  async getAllMeetingsByUserId(
    userId: number,
    filters?: {
      month?: string;
      week?: number;
    },
  ) {
    const qb = this.meetingRepo
      .createQueryBuilder('m')
      .leftJoinAndSelect('m.preSalesOwners', 'preSalesOwners') // ✅ ADD THIS
      .where('m."userId" = :userId', { userId });

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

    qb.orderBy('m.createdAt', 'DESC');

    return qb.getMany();
  }

  async deleteMeeting(
    actor: { type: 'ADMIN' | 'USER'; id: number },
    meetingId: number,
  ) {
    const meeting = await this.meetingRepo.findOne({
      where: { id: meetingId },
      relations: ['user'],
    });

    if (!meeting) {
      throw new NotFoundException('Meeting not found');
    }

    await this.meetingRepo.remove(meeting);

    // ✅ Audit log
    await this.auditService.log({
      actorType: actor.type,
      actorId: actor.id,
      action: AuditAction.DELETE_MEETING,
      entity: 'MEETING',
      entityId: meeting.id,
      metadata: {
        repName: meeting.repName,
        userId: meeting.userId,
        reportingMonth: meeting.reportingMonth,
        reportingWeek: meeting.reportingWeek,
        customerName: meeting.customerName,
      },
    });

    return {
      success: true,
      message: 'Meeting deleted successfully',
    };
  }
}
