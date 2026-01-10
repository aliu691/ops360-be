import { Controller, Post, Body } from '@nestjs/common';
import { AdminsService } from './admins.service';

@Controller('admins')
export class AdminsController {
  constructor(private readonly adminsService: AdminsService) {}

  @Post('invite')
  invite(@Body('email') email: string) {
    return this.adminsService.inviteAdmin(email);
  }

  @Post('accept-invite')
  acceptInvite(
    @Body('token') token: string,
    @Body('password') password: string,
  ) {
    return this.adminsService.acceptInvite(token, password);
  }
}
