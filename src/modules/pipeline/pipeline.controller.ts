import { Controller, Get, Post, Body } from '@nestjs/common';
import { PipelineService } from './pipeline.service';
import { CreatePipelineDealDto } from './dto/create-pipeline-deal.dto';

@Controller('pipeline')
export class PipelineController {
  constructor(private readonly service: PipelineService) {}

  @Get()
  async getAll() {
    return {
      success: true,
      items: await this.service.getAllDeals(),
    };
  }

  @Post()
  async create(@Body() dto: CreatePipelineDealDto) {
    return {
      success: true,
      item: await this.service.createManualDeal(dto),
    };
  }
}
