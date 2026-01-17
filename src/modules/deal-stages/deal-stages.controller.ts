import { Controller, Get, Post } from '@nestjs/common';
import { DealStagesService } from './deal-stages.service';

@Controller('deal-stages')
export class DealStagesController {
  constructor(private readonly service: DealStagesService) {}

  @Get()
  async getAll() {
    return {
      success: true,
      items: await this.service.getAllOrdered(),
    };
  }

  // TEMP: remove or guard later
  @Post('seed')
  async seed() {
    return this.service.seedDefaults();
  }
}
