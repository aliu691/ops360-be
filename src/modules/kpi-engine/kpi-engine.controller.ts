import {
  Controller,
  Get,
  Param,
  Query,
  NotFoundException,
  Req,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { KpiEngineService } from './kpi-engine.service';

@Controller('kpi')
export class KpiEngineController {
  constructor(private readonly kpiService: KpiEngineService) {}

  /**
   * USER KPI
   * GET /kpi/me
   */
  @Get('me')
  async getMyKpi(
    @Req() req,
    @Query('month') month?: string,
    @Query('week') week?: string,
    @Query('quarter') quarter?: string,
  ) {
    return this.kpiService.evaluateForRep(req.user, null, {
      month,
      week,
      quarter,
    });
  }

  /**
   * ADMIN / SUPER_ADMIN KPI
   * GET /kpi/:repName
   */
  @Get(':repName')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async getKpiForRep(
    @Req() req,
    @Param('repName') repName: string,
    @Query('month') month?: string,
    @Query('week') week?: string,
    @Query('quarter') quarter?: string,
  ) {
    return this.kpiService.evaluateForRep(req.user, repName, {
      month,
      week,
      quarter,
    });
  }
}
