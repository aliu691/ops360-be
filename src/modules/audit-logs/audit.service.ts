import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './audit-log.entity';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly repo: Repository<AuditLog>,
  ) {}

  async log(params: {
    req?: any;
    actorType: 'USER' | 'ADMIN';
    actorId: number;
    action: string;
    entity?: string;
    entityId?: number;
    metadata?: Record<string, any>;
  }) {
    const { req, ...rest } = params;

    const ip =
      req?.headers['x-forwarded-for']?.toString().split(',')[0] || req?.ip;

    await this.repo.save({
      ...rest,
      ipAddress: ip,
      userAgent: req?.headers['user-agent'],
    });
  }

  async findAll(filters: {
    actorType?: 'USER' | 'ADMIN';
    action?: string;
    entity?: string;
    actorId?: number;
    page: number;
    limit: number;
  }) {
    const { page, limit } = filters;

    const qb = this.repo.createQueryBuilder('a');

    if (filters.actorType) {
      qb.andWhere('a.actorType = :actorType', {
        actorType: filters.actorType,
      });
    }

    if (filters.action) {
      qb.andWhere('a.action = :action', {
        action: filters.action,
      });
    }

    if (filters.entity) {
      qb.andWhere('a.entity = :entity', {
        entity: filters.entity,
      });
    }

    if (filters.actorId) {
      qb.andWhere('a.actorId = :actorId', {
        actorId: filters.actorId,
      });
    }

    qb.orderBy('a.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();

    return {
      success: true,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      items,
    };
  }
}
