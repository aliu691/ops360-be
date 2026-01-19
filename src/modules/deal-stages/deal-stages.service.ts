import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DealStage } from './deal-stage.entity';

@Injectable()
export class DealStagesService {
  constructor(
    @InjectRepository(DealStage)
    private readonly repo: Repository<DealStage>,
  ) {}

  /* -----------------------------
     READ
  ------------------------------*/

  async getAllOrdered() {
    return this.repo.find({
      order: { sortOrder: 'ASC' },
    });
  }

  async findByKey(key: string) {
    return this.repo.findOne({ where: { key } });
  }

  async getById(id: number) {
    return this.repo.findOne({ where: { id } });
  }

  /* -----------------------------
     CREATE (admin-only later)
  ------------------------------*/

  async create(data: {
    key: string;
    name: string;
    probability: number;
    sortOrder: number;
  }) {
    const existing = await this.findByKey(data.key);
    if (existing) {
      throw new BadRequestException('Deal stage already exists');
    }

    const stage = this.repo.create(data);
    return this.repo.save(stage);
  }

  /* -----------------------------
     SEED DEFAULTS
  ------------------------------*/

  async seedDefaults() {
    const defaults = [
      {
        key: 'QUALIFIED',
        name: 'Qualified Opportunity',
        probability: 10,
        sortOrder: 1,
      },
      {
        key: 'NEEDS_DEFINED',
        name: 'Needs defined / RFP / Demo signed off',
        probability: 20,
        sortOrder: 2,
      },
      {
        key: 'PROPOSAL_SUBMITTED',
        name: 'Proposal Submitted',
        probability: 50,
        sortOrder: 3,
      },
      {
        key: 'NEGOTIATION_DONE',
        name: 'Negotiation Done',
        probability: 80,
        sortOrder: 4,
      },
      {
        key: 'CLOSED_WON',
        name: 'Closed Won',
        probability: 100,
        sortOrder: 5,
      },
      {
        key: 'CLOSED_LOST',
        name: 'Closed Lost',
        probability: 0,
        sortOrder: 6,
      },
    ];

    for (const stage of defaults) {
      const exists = await this.findByKey(stage.key);
      if (!exists) {
        await this.repo.save(this.repo.create(stage));
      }
    }

    return { seeded: true };
  }
}
