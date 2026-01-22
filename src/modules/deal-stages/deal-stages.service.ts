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
}
