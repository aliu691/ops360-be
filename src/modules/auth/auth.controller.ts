import { Controller, Post, Body } from '@nestjs/common';
import { Public } from 'src/utils/decorator.public';
import { AdminsService } from '../admins/admins.service';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly adminsService: AdminsService,
  ) {}

  @Public()
  @Post('login')
  login(@Body('email') email: string, @Body('password') password: string) {
    return this.authService.login(email, password);
  }

  @Public()
  @Post('request-password-reset')
  requestPasswordReset(@Body('email') email: string) {
    return this.adminsService.requestPasswordReset(email);
  }

  @Public()
  @Post('reset-password')
  resetPassword(
    @Body('token') token: string,
    @Body('password') password: string,
  ) {
    return this.adminsService.resetPassword(token, password);
  }
}
