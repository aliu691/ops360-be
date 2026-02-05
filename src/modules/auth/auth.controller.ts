// auth/user-auth.controller.ts
import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/user-login.dto';
import { Public } from './decorators/public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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
    @Body('intent') intent?: 'USER_INVITE' | 'RESET',
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
    return this.authService.setPassword(token, password);
  }
}
