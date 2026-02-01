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
import { CreatePipelineDealDto } from './dto/create-pipeline-deal.dto';
import { ImportPipelineDealDto } from './dto/import-pipeline.dto';
import { In } from 'typeorm';
import { User } from '../users/users.entity';
import { UpdatePipelineDealDto } from './dto/update-pipeline-deal.dto';
import { PIPELINE_CONFIG } from 'src/config/pipeline.config';
import { CustomersService } from '../customers/customers.service';
import { Customer } from '../customers/customer.entity';

@Injectable()
export class PipelineService {
  private readonly logger = new Logger(PipelineService.name);
  constructor(
    @InjectRepository(PipelineDeal)
    private readonly dealRepo: Repository<PipelineDeal>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    private readonly dealStagesService: DealStagesService,
    private readonly customersService: CustomersService,
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
      salesOwnerId?: number;
      customerId?: number;
      preSalesOwnerIds?: number[];
    },
  ) {
    if (filters.year) {
      qb.andWhere('deal.year = :year', { year: filters.year });
    }

    if (filters.quarter) {
      qb.andWhere('deal.quarter = :quarter', {
        quarter: filters.quarter,
      });
    }

    if (filters.salesOwnerId) {
      qb.andWhere('deal.salesOwnerId = :salesOwnerId', {
        salesOwnerId: filters.salesOwnerId,
      });
    }

    // ✅ CUSTOMER FILTER
    if (filters.customerId) {
      qb.andWhere('deal.customer_id = :customerId', {
        customerId: filters.customerId,
      });
    }

    if (filters.preSalesOwnerIds?.length) {
      qb.andWhere('preSalesOwners.id IN (:...preSalesOwnerIds)', {
        preSalesOwnerIds: filters.preSalesOwnerIds,
      });
    }
  }

  private applyDealFiltersForAggregation(
    qb: SelectQueryBuilder<any>,
    filters: {
      year?: number;
      quarter?: number;
      salesOwnerId?: number;
      customerId?: number;
      preSalesOwnerIds?: number[];
    },
  ) {
    if (filters.year) {
      qb.andWhere('deal.year = :year', { year: filters.year });
    }

    if (filters.quarter) {
      qb.andWhere('deal.quarter = :quarter', {
        quarter: filters.quarter,
      });
    }

    if (filters.salesOwnerId) {
      qb.andWhere('deal.salesOwnerId = :salesOwnerId', {
        salesOwnerId: filters.salesOwnerId,
      });
    }

    if (filters.customerId) {
      qb.andWhere('deal.customer_id = :customerId', {
        customerId: filters.customerId,
      });
    }

    /**
     * ✅ CRITICAL DIFFERENCE
     * NO JOIN — use EXISTS to avoid duplication
     */
    if (filters.preSalesOwnerIds?.length) {
      qb.andWhere(
        `
        EXISTS (
          SELECT 1
          FROM pipeline_deals_pre_sales_owners_users ps
          WHERE ps.pipelineDealId = deal.id
          AND ps.usersId IN (:...preSalesOwnerIds)
        )
        `,
        { preSalesOwnerIds: filters.preSalesOwnerIds },
      );
    }
  }

  private normalizeDeal(deal: any) {
    const effectiveStage = deal.stageManual ?? deal.stageExcel;
    const effectiveValue = deal.dealValueManual ?? deal.dealValueExcel;

    return {
      ...deal,

      // ✅ customer object (minimal + safe)
      customer: deal.customer
        ? {
            id: deal.customer.id,
            name: deal.customer.name,
          }
        : null,

      // 🔑 normalized fields for frontend
      displayValue: effectiveValue !== null ? Number(effectiveValue) : null,
      displayStage: effectiveStage
        ? {
            id: effectiveStage.id,
            key: effectiveStage.key,
            name: effectiveStage.name,
            probability: effectiveStage.probability,
          }
        : null,
    };
  }

  async getAllDeals(filters: {
    page: number;
    limit: number;
    year?: number;
    quarter?: number;
    stageId?: number;
    salesOwnerId?: number;
    customerId?: number;
    preSalesOwnerIds?: number[];
  }) {
    const { page, limit } = filters;

    /* ======================================================
     * 1️⃣ STAGE TOTALS (SAFE AGGREGATION)
     * ====================================================== */
    const stageTotalsQb = this.dealRepo
      .createQueryBuilder('deal')
      .leftJoin('deal.stageExcel', 'stageExcel')
      .leftJoin('deal.stageManual', 'stageManual')
      .select([
        `COALESCE(stageManual.id, stageExcel.id) AS "stageId"`,
        `COALESCE(stageManual.key, stageExcel.key) AS "stageKey"`,
        `COALESCE(stageManual.name, stageExcel.name) AS "stageName"`,
        `COALESCE(stageManual.probability, stageExcel.probability) AS "probability"`,

        `COUNT(DISTINCT deal.id)::int AS "count"`,

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
      .where('deal.status = :status', { status: 'ACTIVE' });

    this.applyDealFiltersForAggregation(stageTotalsQb, filters);

    if (filters.stageId) {
      stageTotalsQb.andWhere(
        `COALESCE(stageManual.id, stageExcel.id) = :stageId`,
        { stageId: filters.stageId },
      );
    }

    const stageTotalsResult = await stageTotalsQb
      .groupBy(`COALESCE(stageManual.id, stageExcel.id)`)
      .addGroupBy(`COALESCE(stageManual.key, stageExcel.key)`)
      .addGroupBy(`COALESCE(stageManual.name, stageExcel.name)`)
      .addGroupBy(`COALESCE(stageManual.probability, stageExcel.probability)`)
      .getRawMany();

    const stageTotals = stageTotalsResult.reduce(
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

    /* ======================================================
     * 2️⃣ SUMMARY (SAFE AGGREGATION)
     * ====================================================== */
    const summaryQb = this.dealRepo
      .createQueryBuilder('deal')
      .leftJoin('deal.stageExcel', 'stageExcel')
      .leftJoin('deal.stageManual', 'stageManual')
      .where('deal.status = :status', { status: 'ACTIVE' });

    this.applyDealFiltersForAggregation(summaryQb, filters);

    const summaryRaw = await summaryQb
      .select([
        `COUNT(DISTINCT deal.id)::int AS "totalDeals"`,

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
          DISTINCT CASE
            WHEN COALESCE(stageManual.key, stageExcel.key) = 'CLOSE_WON'
            THEN deal.id
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

    /* ======================================================
     * 🎯 TARGET RESOLUTION (RESTORED)
     * ====================================================== */
    const companyYearlyTarget =
      Number(PIPELINE_CONFIG.COMPANY_YEARLY_TARGET) || 0;

    let yearlyTarget: number | null = companyYearlyTarget;
    let quarterlyTarget: number | null =
      companyYearlyTarget > 0 ? Math.round(companyYearlyTarget / 4) : null;

    if (filters.salesOwnerId) {
      const salesOwner = await this.userRepo.findOne({
        where: { id: filters.salesOwnerId },
        select: ['yearlyTarget'],
      });

      if (salesOwner?.yearlyTarget) {
        yearlyTarget = salesOwner.yearlyTarget;
        quarterlyTarget = Math.round(salesOwner.yearlyTarget / 4);
      }
    } else if (filters.preSalesOwnerIds?.length) {
      const preSalesOwners = await this.userRepo.find({
        where: { id: In(filters.preSalesOwnerIds) },
        select: ['yearlyTarget'],
      });

      const summedTarget = preSalesOwners.reduce(
        (sum, u) => sum + (u.yearlyTarget || 0),
        0,
      );

      if (summedTarget > 0) {
        yearlyTarget = summedTarget;
        quarterlyTarget = Math.round(summedTarget / 4);
      }
    }

    const percentToTarget =
      yearlyTarget && yearlyTarget > 0
        ? Math.round((closedWonAmount / yearlyTarget) * 100)
        : null;

    const summary = {
      year: filters.year,
      quarter: filters.quarter,
      totalDeals,
      totalPipelineAmount,
      closedWon: {
        count: closedWonCount,
        amount: closedWonAmount,
      },
      yearlyTarget,
      quarterlyTarget,
      percentToTarget,
      avgDealSize,
      weightedForecast,
    };

    /* ======================================================
     * 3️⃣ PAGINATED ITEMS (ENTITY QUERY)
     * ====================================================== */
    const itemsQb = this.dealRepo
      .createQueryBuilder('deal')
      .leftJoinAndSelect('deal.salesOwner', 'salesOwner')
      .leftJoinAndSelect('deal.preSalesOwners', 'preSalesOwners')
      .leftJoinAndSelect('deal.stageExcel', 'stageExcel')
      .leftJoinAndSelect('deal.stageManual', 'stageManual')
      .leftJoinAndSelect('deal.customer', 'customer')
      .where('deal.status = :status', { status: 'ACTIVE' })
      .distinct(true);

    this.applyDealFilters(itemsQb, filters);

    if (filters.stageId) {
      itemsQb.andWhere(`COALESCE(stageManual.id, stageExcel.id) = :stageId`, {
        stageId: filters.stageId,
      });
    }

    itemsQb
      .orderBy('deal.updatedAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await itemsQb.getManyAndCount();

    const normalizedItems = items.map((deal) => ({
      ...deal,
      displayValue: Number(deal.dealValueManual ?? deal.dealValueExcel),
      displayStage: deal.stageManual ?? deal.stageExcel,
    }));

    return {
      success: true,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      summary,
      stageTotals,
      items: normalizedItems,
    };
  }

  async getByExternalDealId(externalDealId: string) {
    if (!externalDealId.startsWith('OPS360-')) {
      throw new BadRequestException('Invalid deal reference');
    }

    const fullDeal = await this.dealRepo.findOne({
      where: { externalDealId },
      relations: [
        'salesOwner',
        'preSalesOwners',
        'stageExcel',
        'stageManual',
        'customer',
      ],
    });

    if (!fullDeal) {
      throw new NotFoundException(`Deal not found: ${externalDealId}`);
    }

    return {
      success: true,
      message: 'Deals retrieved successfully.',
      deal: this.normalizeDeal(fullDeal),
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

    const customer = await this.customerRepo.findOneBy({
      id: dto.customerId,
    });
    if (!customer) {
      throw new BadRequestException('Invalid customer');
    }

    const preSalesOwners = dto.preSalesOwnerIds?.length
      ? await this.userRepo.findBy({ id: In(dto.preSalesOwnerIds) })
      : [];

    const closeDate = dto.expectedCloseDate
      ? new Date(dto.expectedCloseDate)
      : new Date();

    const year = closeDate.getFullYear();
    const quarter = Math.ceil((closeDate.getMonth() + 1) / 3) as 1 | 2 | 3 | 4;

    const deal = this.dealRepo.create() as PipelineDeal;

    /** -----------------------------
     * CORE FIELDS
     ------------------------------*/
    deal.customer = customer;
    deal.organizationName = customer.name; // 🔑 derived
    deal.dealName = dto.dealName;

    deal.dealValueExcel = dto.dealValue;
    deal.stageExcelId = stage.id;

    deal.salesOwnerId = salesOwner.id;
    deal.preSalesOwners = preSalesOwners;

    deal.expectedCloseDate = closeDate;
    deal.nextAction = dto.nextAction ?? undefined;
    deal.redFlag = dto.redFlag ?? undefined;

    deal.year = year;
    deal.quarter = quarter;
    deal.source = 'UI';
    deal.status = 'ACTIVE';

    /** -----------------------------
     * SAVE & GENERATE EXTERNAL ID
     ------------------------------*/
    const saved = await this.dealRepo.save(deal);

    saved.externalDealId = `OPS360-${String(saved.id).padStart(6, '0')}`;
    await this.dealRepo.save(saved);

    const fullDeal = await this.dealRepo.findOne({
      where: { id: saved.id },
      relations: [
        'customer',
        'salesOwner',
        'preSalesOwners',
        'stageExcel',
        'stageManual',
      ],
    });

    return {
      success: true,
      message: 'Deal created successfully',
      deal: this.normalizeDeal(fullDeal),
    };
  }

  /* -----------------------------
     Update (UI)
  ------------------------------*/

  async updateDeal(externalDealId: string, dto: UpdatePipelineDealDto) {
    const deal = await this.dealRepo.findOne({
      where: { externalDealId },
      relations: ['preSalesOwners', 'customer'],
    });

    if (!deal) {
      throw new NotFoundException(`Deal not found: ${externalDealId}`);
    }

    /** -----------------------------
   * CUSTOMER CHANGE
   ------------------------------*/
    if (dto.customerId !== undefined) {
      const customer = await this.customerRepo.findOneBy({
        id: dto.customerId,
      });

      if (!customer) {
        throw new BadRequestException('Invalid customer');
      }

      deal.customer = customer;
      deal.organizationName = customer.name; // 🔑 sync
    }

    /** -----------------------------
   * STAGE (MANUAL OVERRIDE)
   ------------------------------*/
    if (dto.stageId !== undefined) {
      const stage = await this.dealStagesService.getById(dto.stageId);
      if (!stage) {
        throw new BadRequestException('Invalid stage');
      }
      deal.stageManualId = stage.id;
    }

    /** -----------------------------
   * OWNERSHIP
   ------------------------------*/
    if (dto.salesOwnerId !== undefined) {
      deal.salesOwnerId = dto.salesOwnerId;
    }

    if (dto.preSalesOwnerIds !== undefined) {
      deal.preSalesOwners = dto.preSalesOwnerIds.length
        ? await this.userRepo.findBy({ id: In(dto.preSalesOwnerIds) })
        : [];
    }

    /** -----------------------------
   * EXPECTED CLOSE DATE
   ------------------------------*/
    if (dto.expectedCloseDate !== undefined) {
      const date = new Date(dto.expectedCloseDate);
      if (isNaN(date.getTime())) {
        throw new BadRequestException('Invalid expectedCloseDate');
      }

      deal.expectedCloseDate = date;
      deal.year = date.getFullYear();
      deal.quarter = Math.ceil((date.getMonth() + 1) / 3) as 1 | 2 | 3 | 4;
    }

    /** -----------------------------
   * MANUAL VALUE OVERRIDE
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
    if (dto.dealName !== undefined) {
      deal.dealName = dto.dealName;
    }

    deal.source = 'UI';

    await this.dealRepo.save(deal);

    const fullDeal = await this.dealRepo.findOne({
      where: { id: deal.id },
      relations: [
        'customer',
        'salesOwner',
        'preSalesOwners',
        'stageExcel',
        'stageManual',
      ],
    });

    return {
      success: true,
      message: 'Deal updated successfully',
      deal: this.normalizeDeal(fullDeal),
    };
  }

  /* -----------------------------
     EXCEL UPSERT
  ------------------------------*/

  async upsertFromExcel(dto: ImportPipelineDealDto) {
    const quarter = this.parseQuarter(dto.quarterRaw);

    /** -----------------------------
     * 1️⃣ Check for existing Excel deal
     ------------------------------*/
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

    /** -----------------------------
     * 2️⃣ Resolve stage
     ------------------------------*/
    const stage = await this.dealStagesService.findByKey(dto.stageKey);
    if (!stage) {
      throw new BadRequestException(`Invalid deal stage: ${dto.stageKey}`);
    }

    /** -----------------------------
     * 3️⃣ Resolve customer (KEY CHANGE)
     ------------------------------*/
    const customer = dto.organizationName
      ? await this.customersService.findOrCreateCustomerByName(
          dto.organizationName,
        )
      : null;

    /** -----------------------------
     * 4️⃣ Create deal
     ------------------------------*/
    const deal = this.dealRepo.create() as PipelineDeal;

    Object.assign(deal, {
      // keep raw organization name for traceability
      organizationName: dto.organizationName,

      dealName: dto.dealName,
      dealValueExcel: dto.dealValueExcel ?? 0,

      stageExcelId: stage.id,
      salesOwnerId: dto.salesOwnerId,

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

    // ✅ Attach customer relationship
    if (customer) {
      deal.customer = customer;
    }

    /** -----------------------------
     * 5️⃣ Save → generate external ID
     ------------------------------*/
    const savedDeal = await this.dealRepo.save(deal);

    savedDeal.externalDealId = `OPS360-${String(savedDeal.id).padStart(6, '0')}`;

    return this.dealRepo.save(savedDeal);
  }
}
