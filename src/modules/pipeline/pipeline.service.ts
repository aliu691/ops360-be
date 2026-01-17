import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PipelineDeal } from './pipeline-deal.entity';
import { DealStagesService } from '../deal-stages/deal-stages.service';
import { UsersService } from '../users/users.service';
import { CreatePipelineDealDto } from './dto/create-pipeline-deal.dto';
import { ImportPipelineDealDto } from './dto/import-pipeline.dto';

@Injectable()
export class PipelineService {
  constructor(
    @InjectRepository(PipelineDeal)
    private readonly dealRepo: Repository<PipelineDeal>,

    private readonly dealStagesService: DealStagesService,
    private readonly usersService: UsersService,
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

  /* -----------------------------
     READ
  ------------------------------*/

  async getAllDeals() {
    return this.dealRepo.find({
      relations: ['salesOwner', 'preSalesOwner', 'stageExcel', 'stageManual'],
      order: { updatedAt: 'DESC' },
    });
  }

  async getDealsBySalesOwner(userId: number) {
    return this.dealRepo.find({
      where: { salesOwnerId: userId },
      relations: ['stageExcel', 'stageManual'],
    });
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

    // Derive dates safely
    const closeDate = dto.expectedCloseDate
      ? new Date(dto.expectedCloseDate)
      : new Date();

    const year = closeDate.getFullYear();
    const month = closeDate.getMonth() + 1;
    const quarter = Math.ceil(month / 3) as 1 | 2 | 3 | 4;

    // 1️⃣ Create deal WITHOUT externalDealId
    const deal = this.dealRepo.create({
      dealName: dto.dealName,

      // Manual deals never rely on Excel value
      dealValueExcel: 0,
      dealValueManual: dto.dealValue ?? 0,

      stageManualId: dto.stageId,

      salesOwnerId: dto.salesOwnerId,
      preSalesOwnerId: dto.preSalesOwnerId,

      year,
      quarter,

      source: 'UI',
      expectedCloseDate: closeDate,
    });

    // 2️⃣ Save to get numeric ID
    const savedDeal = await this.dealRepo.save(deal);

    // 3️⃣ Generate OPS360-XXXXXX
    savedDeal.externalDealId = `OPS360-${String(savedDeal.id).padStart(6, '0')}`;

    // 4️⃣ Persist deal code
    await this.dealRepo.save(savedDeal);

    return savedDeal;
  }

  /* -----------------------------
     EXCEL UPSERT
  ------------------------------*/

  async upsertFromExcel(dto: ImportPipelineDealDto) {
    const stage = await this.dealStagesService.findByKey(dto.stageKey);

    if (!stage) {
      throw new BadRequestException(`Invalid deal stage: ${dto.stageKey}`);
    }

    const quarter = this.parseQuarter(dto.quarterRaw);

    // ✅ Force single-entity creation
    const deal = this.dealRepo.create() as PipelineDeal;

    Object.assign(deal, {
      organizationName: dto.organizationName,
      dealName: dto.dealName,

      dealValueExcel: dto.dealValueExcel ?? 0,

      stageExcelId: stage.id,

      salesOwnerId: dto.salesOwnerId,
      preSalesOwnerId: dto.preSalesOwnerId ?? null,

      expectedCloseDate: dto.expectedCloseDate ?? null,
      nextAction: dto.nextAction ?? null,

      redFlag:
        typeof dto.redFlag === 'string' && dto.redFlag.trim().length > 0
          ? dto.redFlag.trim()
          : null,

      year: dto.year,
      quarter,

      source: 'EXCEL',
      status: 'ACTIVE',
    });

    // 1️⃣ Save to get numeric ID
    const savedDeal = await this.dealRepo.save(deal);

    // 2️⃣ Generate OPS360 deal code
    savedDeal.externalDealId = `OPS360-${String(savedDeal.id).padStart(6, '0')}`;

    // 3️⃣ Persist deal code
    return this.dealRepo.save(savedDeal);
  }
}
