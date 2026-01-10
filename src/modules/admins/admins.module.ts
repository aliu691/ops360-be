import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Admin } from './admins.entity';
import { AdminInvite } from './admins_invites.entity';
import { AdminsService } from './admins.service';
import { AdminsController } from './admins.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Admin, AdminInvite])],
  providers: [AdminsService],
  controllers: [AdminsController],
  exports: [AdminsService],
})
export class AdminsModule {}
