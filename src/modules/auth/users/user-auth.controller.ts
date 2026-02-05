// auth/user-auth.controller.ts
import { Controller, Post, Body } from '@nestjs/common';
import { UserAuthService } from './user-auth.service';
import { LoginDto } from '../dto/user-login.dto';
import { Public } from '../decorators/public.decorator';

@Controller('auth')
export class UserAuthController {
  constructor(private readonly authService: UserAuthService) {}

  /* =========================
     LOGIN
  ========================= */
  @Public()
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  /* =========================
     REQUEST PASSWORD RESET / SETUP
     (used for invite + forgot password)
  ========================= */
  @Public()
  @Post('request-password-reset')
  requestPasswordReset(
    @Body('email') email: string,
    @Body('intent') intent?: 'INVITE' | 'RESET',
  ) {
    return this.authService.requestPasswordReset(email, intent ?? 'RESET');
  }

  /* =========================
     RESET / SET PASSWORD
  ========================= */
  @Public()
  @Post('reset-password')
  resetPassword(
    @Body('token') token: string,
    @Body('password') password: string,
  ) {
    return this.authService.resetPassword(token, password);
  }
}
