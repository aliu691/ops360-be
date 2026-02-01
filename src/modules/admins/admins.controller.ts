import {
  Controller,
  Post,
  Body,
  Req,
  Get,
  Param,
  UseGuards,
} from '@nestjs/common';
import { Public } from 'src/utils/decorator.public';
import { Roles } from 'src/utils/decorator.roles';
import { RolesGuard } from 'src/utils/guards.roles';
import { AdminRole } from './admins.entity';
import { AdminsService } from './admins.service';

@Controller('admins')
export class AdminsController {
  constructor(private readonly adminsService: AdminsService) {}

  @Post('invite')
  @Roles(AdminRole.SUPER_ADMIN)
  async inviteAdmin(@Body('email') email: string, @Req() req) {
    return this.adminsService.inviteAdmin(email, req.user);
  }

  @Public()
  @Post('accept-invite')
  acceptInvite(
    @Body('token') token: string,
    @Body('password') password: string,
  ) {
    return this.adminsService.acceptInvite(token, password);
  }

  @Get()
  @Roles(AdminRole.SUPER_ADMIN)
  findAll() {
    return this.adminsService.findAll();
  }

  @Get(':email')
  @Roles(AdminRole.SUPER_ADMIN)
  findOne(@Param('email') email: string) {
    return this.adminsService.findByEmail(email);
  }
}
