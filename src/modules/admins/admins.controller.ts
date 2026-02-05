import {
  Controller,
  Post,
  Body,
  Req,
  Get,
  Param,
  UseGuards,
} from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AdminsService } from './admins.service';

@Controller('admins')
export class AdminsController {
  constructor(private readonly adminsService: AdminsService) {}

  @Post('invite')
  @Roles('SUPER_ADMIN')
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
  @Roles('SUPER_ADMIN')
  findAll() {
    return this.adminsService.findAll();
  }

  @Get(':email')
  @Roles('SUPER_ADMIN')
  findOne(@Param('email') email: string) {
    return this.adminsService.findByEmail(email);
  }
}
