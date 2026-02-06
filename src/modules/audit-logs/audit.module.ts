import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from './audit-log.entity';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';
import { User } from '../users/users.entity';
import { Admin } from '../admins/admins.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AuditLog, User, Admin])],
  providers: [AuditService],
  controllers: [AuditController],
  exports: [AuditService],
})
export class AuditModule {}
