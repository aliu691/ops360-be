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
import { UpdatePipelineDealDto } from './dto/update-pipeline-deal.dto';

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
    const { page, limit, salesOwnerId } = filters;

    /** -----------------------------
     * Base query (shared filters)
     ------------------------------*/
    const baseQb = this.dealRepo
      .createQueryBuilder('deal')
      .leftJoin('deal.preSalesOwners', 'preSalesOwners')
      .leftJoin('deal.stageExcel', 'stageExcel')
      .leftJoin('deal.stageManual', 'stageManual');

    this.applyDealFilters(baseQb, filters);

    /** -----------------------------
     * 1️⃣ Stage totals (effective + weighted)
     ------------------------------*/
    const stageTotalsRaw = await baseQb
      .clone()
      .select([
        `COALESCE(stageManual.id, stageExcel.id) AS "stageId"`,
        `COALESCE(stageManual.key, stageExcel.key) AS "stageKey"`,
        `COALESCE(stageManual.name, stageExcel.name) AS "stageName"`,
        `COALESCE(stageManual.probability, stageExcel.probability) AS "probability"`,

        `COUNT(deal.id)::int AS "count"`,

        `
       SUM(
         COALESCE(deal.dealValueManual, deal.dealValueExcel)
       )::float AS "amount"
       `,

        `
       SUM(
         COALESCE(deal.dealValueManual, deal.dealValueExcel)
         * (COALESCE(stageManual.probability, stageExcel.probability) / 100.0)
       )::float AS "weightedAmount"
       `,
      ])
      .groupBy('COALESCE(stageManual.id, stageExcel.id)')
      .addGroupBy('COALESCE(stageManual.key, stageExcel.key)')
      .addGroupBy('COALESCE(stageManual.name, stageExcel.name)')
      .addGroupBy('COALESCE(stageManual.probability, stageExcel.probability)')
      .getRawMany();

    const stageTotals = stageTotalsRaw.reduce(
      (acc, row) => {
        acc[row.stageKey] = {
          stageId: Number(row.stageId),
          stageName: row.stageName,
          probability: Number(row.probability),
          count: Number(row.count),
          amount: Number(row.amount),
          weightedAmount: Number(row.weightedAmount),
        };
        return acc;
      },
      {} as Record<string, any>,
    );

    /** -----------------------------
     * 2️⃣ Summary (pipeline KPIs)
     ------------------------------*/
    const summaryRaw = await baseQb
      .clone()
      .select([
        `COUNT(deal.id)::int AS "totalDeals"`,

        `
        SUM(
          COALESCE(deal.dealValueManual, deal.dealValueExcel)
        )::float AS "totalPipelineAmount"
        `,

        `
        SUM(
          CASE
            WHEN COALESCE(stageManual.key, stageExcel.key) = 'CLOSE_WON'
            THEN COALESCE(deal.dealValueManual, deal.dealValueExcel)
            ELSE 0
          END
        )::float AS "closedWonAmount"
        `,

        `
        COUNT(
          CASE
            WHEN COALESCE(stageManual.key, stageExcel.key) = 'CLOSE_WON'
            THEN 1
          END
        )::int AS "closedWonCount"
        `,

        `
        SUM(
          COALESCE(deal.dealValueManual, deal.dealValueExcel)
          * (COALESCE(stageManual.probability, stageExcel.probability) / 100.0)
        )::float AS "weightedForecast"
        `,
      ])
      .getRawOne();

    const totalDeals = Number(summaryRaw.totalDeals);
    const totalPipelineAmount = Number(summaryRaw.totalPipelineAmount);
    const closedWonAmount = Number(summaryRaw.closedWonAmount);
    const closedWonCount = Number(summaryRaw.closedWonCount);
    const weightedForecast = Number(summaryRaw.weightedForecast);

    const avgDealSize =
      totalDeals > 0 ? Math.round(totalPipelineAmount / totalDeals) : 0;

    /**
     * Quarterly target:
     * - If salesOwnerId is present → use that user's yearlyTarget / 4
     * - Otherwise → null (team/org view)
     */
    let quarterlyTarget: number | null = null;
    let percentToTarget: number | null = null;

    if (salesOwnerId) {
      const owner = await this.userRepo.findOne({
        where: { id: salesOwnerId },
        select: ['yearlyTarget'],
      });

      if (owner?.yearlyTarget) {
        quarterlyTarget = Math.round(owner.yearlyTarget / 4);
        percentToTarget =
          quarterlyTarget > 0
            ? Math.round((closedWonAmount / quarterlyTarget) * 100)
            : 0;
      }
    }

    const summary = {
      year: filters.year,
      quarter: filters.quarter,

      totalDeals,
      totalPipelineAmount,

      closedWon: {
        count: closedWonCount,
        amount: closedWonAmount,
      },

      quarterlyTarget,
      percentToTarget,

      avgDealSize,
      weightedForecast,
    };

    /** -----------------------------
     * 3️⃣ Paginated items
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
     * Final response
     ------------------------------*/
    return {
      success: true,
      page,
      limit,
      total,
      totalPages,
      summary,
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
      relations: ['salesOwner', 'preSalesOwners', 'stageExcel', 'stageManual'],
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
    const stage = await this.dealStagesService.getById(dto.stageId);
    if (!stage) {
      throw new BadRequestException('Invalid deal stage');
    }

    const salesOwner = await this.userRepo.findOneBy({
      id: dto.salesOwnerId,
    });
    if (!salesOwner) {
      throw new BadRequestException('Invalid sales owner');
    }

    const preSalesOwners = dto.preSalesOwnerIds?.length
      ? await this.userRepo.findBy({
          id: In(dto.preSalesOwnerIds),
        })
      : [];

    const closeDate = dto.expectedCloseDate
      ? new Date(dto.expectedCloseDate)
      : new Date();

    const year = closeDate ? closeDate.getFullYear() : new Date().getFullYear();

    const month = closeDate.getMonth() + 1;
    const quarter = Math.ceil(month / 3) as 1 | 2 | 3 | 4;

    // ✅ FORCE single entity creation
    const deal = this.dealRepo.create() as PipelineDeal;

    // ✅ SAFE assignment
    deal.organizationName = dto.organizationName;
    deal.dealName = dto.dealName;
    deal.dealValueExcel = dto.dealValue;
    deal.stageExcelId = stage.id;
    deal.salesOwnerId = salesOwner.id;
    deal.preSalesOwners = preSalesOwners;

    if (closeDate) {
      deal.expectedCloseDate = closeDate;
    }

    deal.nextAction = dto.nextAction ?? undefined;
    deal.redFlag = dto.redFlag ?? undefined;

    deal.year = year;
    deal.quarter = quarter; // guaranteed 1–4

    deal.source = 'UI';
    deal.status = 'ACTIVE';

    // 1️⃣ Save to get numeric ID
    const saved = await this.dealRepo.save(deal);

    // 2️⃣ Generate external ID
    saved.externalDealId = `OPS360-${String(saved.id).padStart(6, '0')}`;

    // 3️⃣ Persist external ID
    await this.dealRepo.save(saved);

    const fullDeal = await this.dealRepo.findOne({
      where: { id: saved.id },
      relations: ['salesOwner', 'preSalesOwners', 'stageExcel', 'stageManual'],
    });

    return {
      success: true,
      message: 'Deal created successfully',
      deal: fullDeal,
    };
  }

  /* -----------------------------
     Update (UI)
  ------------------------------*/

  async updateDeal(externalDealId: string, dto: UpdatePipelineDealDto) {
    const deal = await this.dealRepo.findOne({
      where: { externalDealId },
      relations: ['preSalesOwners'],
    });

    if (!deal) {
      throw new NotFoundException(`Deal not found: ${externalDealId}`);
    }

    /** -----------------------------
     * STAGE (MANUAL OVERRIDE)
     ------------------------------*/
    if (dto.stageId) {
      const stage = await this.dealStagesService.getById(dto.stageId);
      if (!stage) {
        throw new BadRequestException('Invalid stage');
      }
      deal.stageManualId = stage.id;
    }

    /** -----------------------------
     * OWNERSHIP
     ------------------------------*/
    if (dto.salesOwnerId) {
      deal.salesOwnerId = dto.salesOwnerId;
    }

    if (dto.preSalesOwnerIds) {
      deal.preSalesOwners = await this.userRepo.findBy({
        id: In(dto.preSalesOwnerIds),
      });
    }

    /** -----------------------------
     * EXPECTED CLOSE DATE
     ------------------------------*/
    if (dto.expectedCloseDate) {
      const date = new Date(dto.expectedCloseDate);
      if (isNaN(date.getTime())) {
        throw new BadRequestException('Invalid expectedCloseDate');
      }

      deal.expectedCloseDate = date;
      deal.year = date.getFullYear();
      deal.quarter = Math.ceil((date.getMonth() + 1) / 3) as 1 | 2 | 3 | 4;
    }

    /** -----------------------------
     * MANUAL VALUE OVERRIDES
     ------------------------------*/
    if (dto.dealValue !== undefined) {
      deal.dealValueManual = dto.dealValue;
    }

    if (dto.nextAction !== undefined) {
      deal.nextAction = dto.nextAction;
    }

    if (dto.redFlag !== undefined) {
      deal.redFlag = dto.redFlag;
    }

    /** -----------------------------
     * BASIC INFO
     ------------------------------*/
    if (dto.organizationName !== undefined) {
      deal.organizationName = dto.organizationName;
    }

    if (dto.dealName !== undefined) {
      deal.dealName = dto.dealName;
    }

    /** -----------------------------
     * SOURCE = UI (IMPORTANT)
     ------------------------------*/
    deal.source = 'UI';

    await this.dealRepo.save(deal);

    /** -----------------------------
     * RETURN FULL OBJECT
     ------------------------------*/
    const fullDeal = await this.dealRepo.findOne({
      where: { id: deal.id },
      relations: ['salesOwner', 'preSalesOwners', 'stageExcel', 'stageManual'],
    });

    return {
      success: true,
      message: 'Deal updated successfully',
      deal: fullDeal,
    };
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
