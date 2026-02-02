import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Patch,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { PipelineService } from './pipeline.service';
import { CreatePipelineDealDto } from './dto/create-pipeline-deal.dto';
import { UpdatePipelineDealDto } from './dto/update-pipeline-deal.dto';

@Controller('pipeline')
export class PipelineController {
  constructor(private readonly service: PipelineService) {}

  @Post()
  async createManual(@Body() dto: CreatePipelineDealDto, @Req() req) {
    if (req.user.type !== 'USER') {
      throw new ForbiddenException('Only sales users can create deals');
    }

    return this.service.createManualDeal(dto, req.user.id);
  }

  @Get('deal/:externalDealId')
  async getByExternalDealId(
    @Req() req,
    @Param('externalDealId') externalDealId: string,
  ) {
    return this.service.getByExternalDealId(req.user, externalDealId);
  }

  @Get()
  async getAll(
    @Req() req,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('year') year?: number,
    @Query('quarter') quarter?: number,
    @Query('stageId') stageId?: number,
    @Query('salesOwnerId') salesOwnerId?: number,
    @Query('customerId') customerId?: number,
    @Query('preSalesOwnerIds') preSalesOwnerIds?: string,
  ) {
    return this.service.getAllDeals(req.user, {
      page: Number(page),
      limit: Number(limit),
      year,
      quarter,
      stageId,
      salesOwnerId,
      customerId,
      preSalesOwnerIds: preSalesOwnerIds
        ? preSalesOwnerIds.split(',').map(Number)
        : undefined,
    });
  }

  @Patch(':externalDealId')
  async updateDeal(
    @Req() req,
    @Param('externalDealId') externalDealId: string,
    @Body() dto: UpdatePipelineDealDto,
  ) {
    return this.service.updateDeal(req.user, externalDealId, dto);
  }
}
