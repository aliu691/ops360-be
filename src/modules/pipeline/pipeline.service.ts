import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { PipelineDeal } from './pipeline-deal.entity';
import { DealStagesService } from '../deal-stages/deal-stages.service';
import { UsersService } from '../users/users.service';
import { CreatePipelineDealDto } from './dto/create-pipeline-deal.dto';
import { ImportPipelineDealDto } from './dto/import-pipeline.dto';
import { In } from 'typeorm';
import { User } from '../users/users.entity';

@Injectable()
export class PipelineService {
  private readonly logger = new Logger(PipelineService.name);
  constructor(
    @InjectRepository(PipelineDeal)
    private readonly dealRepo: Repository<PipelineDeal>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly dealStagesService: DealStagesService,
  ) {}

  /* -----------------------------
     HELPERS
  ------------------------------*/

  private parseQuarter(value: string | number): 1 | 2 | 3 | 4 {
    const normalized = value.toString().toUpperCase();

    if (normalized.includes('1')) return 1;
    if (normalized.includes('2')) return 2;
    if (normalized.includes('3')) return 3;
    if (normalized.includes('4')) return 4;

    throw new BadRequestException(`Invalid quarter value: ${value}`);
  }

  private applyDealFilters(
    qb: SelectQueryBuilder<PipelineDeal>,
    filters: {
      year?: number;
      quarter?: number;
      stageId?: number;
      stageKey?: string;
      salesOwnerId?: number;
      preSalesOwnerIds?: number[];
    },
  ) {
    const { year, quarter, stageId, stageKey, salesOwnerId, preSalesOwnerIds } =
      filters;

    if (year) qb.andWhere('deal.year = :year', { year });
    if (quarter) qb.andWhere('deal.quarter = :quarter', { quarter });

    if (stageKey) {
      qb.andWhere('stageExcel.key = :stageKey', {
        stageKey: stageKey.toUpperCase(),
      });
    } else if (stageId) {
      qb.andWhere('deal.stageExcelId = :stageId', { stageId });
    }

    if (salesOwnerId) {
      qb.andWhere('deal.salesOwnerId = :salesOwnerId', { salesOwnerId });
    }

    if (preSalesOwnerIds?.length) {
      qb.andWhere('preSalesOwners.id IN (:...preSalesOwnerIds)', {
        preSalesOwnerIds,
      });
    }
  }

  /* -----------------------------
     READ
  ------------------------------*/

  async getAllDeals(filters: {
    page: number;
    limit: number;
    year?: number;
    quarter?: number;
    stageId?: number;
    stageKey?: string;
    salesOwnerId?: number;
    preSalesOwnerIds?: number[];
  }) {
    const { page, limit } = filters;

    /** -----------------------------
     * Base query (no pagination)
     ------------------------------*/
    const baseQb = this.dealRepo
      .createQueryBuilder('deal')
      .leftJoin('deal.preSalesOwners', 'preSalesOwners');

    this.applyDealFilters(baseQb, filters);

    /** -----------------------------
     * 1️⃣ Stage totals
     ------------------------------*/
    const stageTotalsRaw = await baseQb
      .clone()
      .leftJoin('deal.stageExcel', 'stageExcel')
      .select([
        'stageExcel.id AS "stageId"',
        'stageExcel.key AS "stageKey"',
        'stageExcel.name AS "stageName"',
        'COUNT(deal.id)::int AS "count"',
        'COALESCE(SUM(deal.dealValueExcel), 0)::float AS "amount"',
      ])
      .groupBy('stageExcel.id')
      .addGroupBy('stageExcel.key')
      .addGroupBy('stageExcel.name')
      .getRawMany();

    const stageTotals = stageTotalsRaw.reduce(
      (acc, row) => {
        acc[row.stageKey] = {
          stageId: row.stageId,
          stageName: row.stageName,
          count: row.count,
          amount: row.amount,
        };
        return acc;
      },
      {} as Record<string, any>,
    );

    /** -----------------------------
     * 2️⃣ Paginated results
     ------------------------------*/
    const itemsQb = this.dealRepo
      .createQueryBuilder('deal')
      .leftJoinAndSelect('deal.salesOwner', 'salesOwner')
      .leftJoinAndSelect('deal.preSalesOwners', 'preSalesOwners')
      .leftJoinAndSelect('deal.stageExcel', 'stageExcel')
      .leftJoinAndSelect('deal.stageManual', 'stageManual')
      .distinct(true);

    this.applyDealFilters(itemsQb, filters);

    itemsQb
      .orderBy('deal.updatedAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await itemsQb.getManyAndCount();
    const totalPages = Math.ceil(total / limit);

    /** -----------------------------
     * Response
     ------------------------------*/
    return {
      success: true,
      page,
      limit,
      total,
      totalPages,
      stageTotals,
      items,
    };
  }

  async getByExternalDealId(externalDealId: string) {
    if (!externalDealId.startsWith('OPS360-')) {
      throw new BadRequestException('Invalid deal reference');
    }

    const deal = await this.dealRepo.findOne({
      where: { externalDealId },
      relations: ['salesOwner', 'preSalesOwner', 'stageExcel', 'stageManual'],
    });

    if (!deal) {
      throw new NotFoundException(`Deal not found: ${externalDealId}`);
    }

    return {
      success: true,
      message: 'Deal retrieved successfully.',
      deal,
    };
  }

  /* -----------------------------
     CREATE (UI)
  ------------------------------*/

  async createManualDeal(dto: CreatePipelineDealDto) {
    const stage = await this.dealStagesService
      .getAllOrdered()
      .then((stages) => stages.find((s) => s.id === dto.stageId));

    if (!stage) {
      throw new BadRequestException('Invalid deal stage');
    }

    const closeDate = dto.expectedCloseDate
      ? new Date(dto.expectedCloseDate)
      : new Date();

    const year = closeDate.getFullYear();
    const quarter = Math.ceil((closeDate.getMonth() + 1) / 3) as 1 | 2 | 3 | 4;

    const preSalesOwners = dto.preSalesOwnerIds?.length
      ? await this.userRepo.findBy({ id: In(dto.preSalesOwnerIds) })
      : [];

    const deal = this.dealRepo.create({
      organizationName: dto.organizationName,
      dealName: dto.dealName,

      dealValueExcel: dto.dealValueExcel ?? 0,

      stageExcelId: stage.id,
      salesOwnerId: dto.salesOwnerId,
      preSalesOwners,

      expectedCloseDate: dto.expectedCloseDate
        ? new Date(dto.expectedCloseDate)
        : undefined,

      nextAction: dto.nextAction?.trim() || undefined,

      redFlag:
        typeof dto.redFlag === 'string' && dto.redFlag.trim().length > 0
          ? dto.redFlag.trim()
          : undefined,

      year,
      quarter,

      source: 'UI', // ✅ FIXED
      status: 'ACTIVE',
    });

    const savedDeal = await this.dealRepo.save(deal);

    savedDeal.externalDealId = `OPS360-${String(savedDeal.id).padStart(6, '0')}`;

    await this.dealRepo.save(savedDeal);

    return savedDeal;
  }

  /* -----------------------------
     EXCEL UPSERT
  ------------------------------*/

  async upsertFromExcel(dto: ImportPipelineDealDto) {
    const quarter = this.parseQuarter(dto.quarterRaw);

    const existing = await this.dealRepo.findOne({
      where: {
        organizationName: dto.organizationName,
        dealName: dto.dealName,
        year: dto.year,
        quarter,
        salesOwnerId: dto.salesOwnerId,
        source: 'EXCEL',
      },
      select: ['id', 'externalDealId'],
    });

    if (existing) {
      this.logger.debug(
        `Skipping existing Excel deal ${existing.externalDealId}`,
      );
      return existing;
    }

    const stage = await this.dealStagesService.findByKey(dto.stageKey);
    if (!stage) {
      throw new BadRequestException(`Invalid deal stage: ${dto.stageKey}`);
    }

    // ✅ FORCE SINGLE ENTITY
    const deal = this.dealRepo.create() as PipelineDeal;

    Object.assign(deal, {
      organizationName: dto.organizationName,
      dealName: dto.dealName,

      dealValueExcel: dto.dealValueExcel ?? 0,

      stageExcelId: stage.id,
      salesOwnerId: dto.salesOwnerId,

      // ✅ MANY-TO-MANY
      preSalesOwners: dto.preSalesOwners ?? [],

      expectedCloseDate: dto.expectedCloseDate ?? null,
      nextAction: dto.nextAction ?? null,
      redFlag:
        typeof dto.redFlag === 'string' && dto.redFlag.trim()
          ? dto.redFlag.trim()
          : null,

      year: dto.year,
      quarter,

      source: 'EXCEL',
      status: 'ACTIVE',
    });

    // 1️⃣ Save → get numeric ID
    const savedDeal = await this.dealRepo.save(deal);

    // 2️⃣ Generate OPS360 ID
    savedDeal.externalDealId = `OPS360-${String(savedDeal.id).padStart(6, '0')}`;

    // 3️⃣ Persist external ID
    return this.dealRepo.save(savedDeal);
  }
}

function buildFilters(params: {
  year?: number;
  quarter?: string;
  stage?: string;
}) {
  const where: any = {};

  // Year
  if (params.year) {
    where.year = params.year;
  }

  // Quarter (supports multiple)
  if (params.quarter) {
    const quarters = params.quarter
      .split(',')
      .map((q) => Number(q))
      .filter((q) => [1, 2, 3, 4].includes(q));

    if (quarters.length === 1) {
      where.quarter = quarters[0];
    } else if (quarters.length > 1) {
      where.quarter = In(quarters);
    }
  }

  // Stage (by key, supports multiple)
  if (params.stage) {
    const stages = params.stage
      .split(',')
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);

    if (stages.length > 0) {
      where.stageExcel = {
        key: stages.length === 1 ? stages[0] : In(stages),
      };
    }
  }

  return where;
}
