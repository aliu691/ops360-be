import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { PipelineService } from './pipeline.service';
import { CreatePipelineDealDto } from './dto/create-pipeline-deal.dto';

@Controller('pipeline')
export class PipelineController {
  constructor(private readonly service: PipelineService) {}

  @Get()
  async getAll(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('year') year?: number,
    @Query('quarter') quarter?: number,
    @Query('stage') stageKey?: string, // ✅ NEW
    @Query('stageId') stageId?: number, // optional fallback
    @Query('salesOwnerId') salesOwnerId?: number,
    @Query('preSalesOwnerIds') preSalesOwnerIds?: string,
  ) {
    return this.service.getAllDeals({
      page: Number(page),
      limit: Number(limit),
      year,
      quarter,
      stageKey,
      stageId,
      salesOwnerId,
      preSalesOwnerIds: preSalesOwnerIds
        ? preSalesOwnerIds.split(',').map(Number)
        : undefined,
    });
  }

  @Get('deal/:externalDealId')
  async getByExternalDealId(@Param('externalDealId') externalDealId: string) {
    return this.service.getByExternalDealId(externalDealId);
  }

  @Post()
  async create(@Body() dto: CreatePipelineDealDto) {
    return {
      success: true,
      item: await this.service.createManualDeal(dto),
    };
  }
}
