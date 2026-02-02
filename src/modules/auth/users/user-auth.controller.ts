// auth/user-auth.controller.ts
import { Controller, Post, Body } from '@nestjs/common';
import { Public } from 'src/utils/decorator.public';
import { UserLoginDto } from '../dto/user-login.dto';
import { UserAuthService } from './user-auth.service';

@Controller('auth/users')
export class UserAuthController {
  constructor(private readonly authService: UserAuthService) {}

  @Public()
  @Post('login')
  login(@Body() dto: UserLoginDto) {
    return this.authService.login(dto.email, dto.password);
  }
}
