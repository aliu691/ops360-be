import {
  Controller,
  Get,
  Param,
  Query,
  NotFoundException,
  Req,
} from '@nestjs/common';
import { KpiEngineService } from './kpi-engine.service';

@Controller('kpi')
export class KpiEngineController {
  constructor(private readonly kpiService: KpiEngineService) {}

  /**
   * GET /kpi/:repName
   * Optional filters:
   *  - month=YYYY-MM
   *  - week=YYYY-WW
   *  - quarter=YYYY-QN
   */
  @Get(':repName')
  async getLatestForRep(
    @Req() req,
    @Param('repName') repName: string,
    @Query('month') month?: string,
    @Query('week') week?: string,
    @Query('quarter') quarter?: string,
  ) {
    const result = await this.kpiService.evaluateLatestWeekForRep(
      req.user,
      repName,
      {
        month,
        week,
        quarter,
      },
    );

    if (!result) {
      throw new NotFoundException('No KPI data found for rep');
    }

    return result;
  }
}
