import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Admin } from '../admins/admins.entity';
import { User } from '../users/users.entity';
import { AuditLog } from './audit-log.entity';
import { presentAuditLog } from './audit.presenter';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly repo: Repository<AuditLog>,

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    @InjectRepository(Admin)
    private readonly adminRepo: Repository<Admin>,
  ) {}

  //helper
  private async resolveActorMeta(actorType: 'USER' | 'ADMIN', actorId: number) {
    if (actorType === 'USER') {
      const user = await this.userRepo.findOne({
        where: { id: actorId },
        select: ['firstName', 'lastName', 'email', 'department'],
      });

      if (!user) return null;

      return {
        name: `${user.firstName} ${user.lastName ?? ''}`.trim(),
        email: user.email,
        department: user.department,
      };
    }

    const admin = await this.adminRepo.findOne({
      where: { id: actorId },
      select: ['email', 'role'],
    });

    if (!admin) return null;

    return {
      name: admin.email.split('@')[0], // or admin.name if you have it later
      email: admin.email,
      role: admin.role,
    };
  }

  async log(params: {
    req?: any;
    actorType: 'USER' | 'ADMIN';
    actorId: number;
    action: string;
    entity?: string;
    entityId?: number;
    metadata?: Record<string, any>;
  }) {
    const { req, actorType, actorId, metadata, ...rest } = params;

    const actorMeta = await this.resolveActorMeta(actorType, actorId);

    await this.repo.save({
      ...rest,
      actorType,
      actorId,
      metadata: {
        actor: actorMeta,
        ...metadata,
      },
      ipAddress:
        req?.headers['x-forwarded-for']?.toString().split(',')[0] || req?.ip,
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

    /* ===============================
       🔥 ACTOR ENRICHMENT (CORE)
    =============================== */

    const userIds = Array.from(
      new Set(
        items.filter((l) => l.actorType === 'USER').map((l) => l.actorId),
      ),
    );

    const adminIds = Array.from(
      new Set(
        items.filter((l) => l.actorType === 'ADMIN').map((l) => l.actorId),
      ),
    );

    const users = userIds.length
      ? await this.userRepo.find({
          where: { id: In(userIds) },
          select: ['id', 'firstName', 'lastName', 'email', 'department'],
        })
      : [];

    const admins = adminIds.length
      ? await this.adminRepo.find({
          where: { id: In(adminIds) },
          select: ['id', 'email', 'role'],
        })
      : [];

    const userMap = new Map(users.map((u) => [u.id, u]));
    const adminMap = new Map(admins.map((a) => [a.id, a]));

    const enriched = items.map((log) => {
      let actor: any = null;

      if (log.actorType === 'USER') {
        const u = userMap.get(log.actorId);
        if (u) {
          actor = {
            type: 'USER',
            id: u.id,
            name: `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim(),
            email: u.email,
            department: u.department,
          };
        }
      }

      if (log.actorType === 'ADMIN') {
        const a = adminMap.get(log.actorId);
        if (a) {
          actor = {
            type: 'ADMIN',
            id: a.id,
            email: a.email,
            role: a.role,
          };
        }
      }

      return {
        ...log,
        metadata: {
          ...(log.metadata ?? {}),
          actor,
        },
      };
    });

    return {
      success: true,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      items: enriched.map(presentAuditLog),
    };
  }

  async findOne(id: number) {
    const log = await this.repo.findOne({ where: { id } });

    if (!log) {
      throw new NotFoundException('Audit log not found');
    }

    return {
      success: true,
      item: log,
    };
  }
}
