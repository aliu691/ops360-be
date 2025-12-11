import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { KpiEngineService } from './kpi-engine.service';

@Controller('kpi')
export class KpiEngineController {
  constructor(private readonly kpiService: KpiEngineService) {}

  // GET /kpi/:repName  -> latest week evaluation for rep
  @Get(':repName')
  async getLatestForRep(@Param('repName') repName: string) {
    const result = await this.kpiService.evaluateLatestWeekForRep(repName);

    if (!result) {
      throw new NotFoundException('No KPI data found for rep');
    }

    return result;
  }
}
