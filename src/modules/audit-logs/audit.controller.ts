import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuditService } from './audit.service';

@Controller('audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  /**
   * 🔒 SUPER ADMIN ONLY
   * GET /audit-logs
   */
  @Get()
  @Roles('SUPER_ADMIN')
  async getAuditLogs(
    @Query('actorType') actorType?: 'USER' | 'ADMIN',
    @Query('action') action?: string,
    @Query('entity') entity?: string,
    @Query('actorId') actorId?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.auditService.findAll({
      actorType,
      action,
      entity,
      actorId: actorId ? Number(actorId) : undefined,
      page: Number(page),
      limit: Number(limit),
    });
  }
}
