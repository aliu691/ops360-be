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

  async getMeetingsByRep(repName: string) {
    return this.meetingRepo.find({
      where: { repName },
      order: { createdAt: 'DESC' },
    });
  }

  async getAllMeetings() {
    return this.meetingRepo.find({
      order: { createdAt: 'DESC' },
    });
  }
}
