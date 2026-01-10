import { Controller, Post, Body } from '@nestjs/common';
import { Public } from 'src/utils/decorator.public';
import { Roles } from 'src/utils/decorator.roles';
import { AdminRole } from './admins.entity';
import { AdminsService } from './admins.service';

@Controller('admins')
export class AdminsController {
  constructor(private readonly adminsService: AdminsService) {}

  @Roles(AdminRole.SUPER_ADMIN)
  @Post('invite')
  invite(@Body('email') email: string) {
    return this.adminsService.inviteAdmin(email);
  }

  @Public()
  @Post('accept-invite')
  acceptInvite(
    @Body('token') token: string,
    @Body('password') password: string,
  ) {
    return this.adminsService.acceptInvite(token, password);
  }
}
