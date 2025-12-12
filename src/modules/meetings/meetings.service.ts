import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Meeting } from './meetings.entity';

@Injectable()
export class MeetingsService {
  constructor(
    @InjectRepository(Meeting)
    private meetingRepo: Repository<Meeting>,
  ) {}

  async saveMeetings(meetings: Partial<Meeting>[]) {
    const entities = this.meetingRepo.create(meetings);
    await this.meetingRepo.save(entities);
  }

  async getMeetingsByRep(repName: string, page = 1, limit = 20) {
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 20;

    const [items, total] = await this.meetingRepo.findAndCount({
      where: { repName },
      order: { createdAt: 'DESC' },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
    });

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

  async getAllMeetings(page = 1, limit = 20) {
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 20;

    const [items, total] = await this.meetingRepo.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
    });

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
