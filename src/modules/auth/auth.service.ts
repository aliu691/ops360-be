import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { AdminsService } from '../admins/admins.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly adminsService: AdminsService,
    private readonly jwtService: JwtService,
  ) {}

  async login(email: string, password: string) {
    const admin = await this.adminsService.findByEmail(email);

    if (!admin || admin.status !== 'ACTIVE') {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValid = await bcrypt.compare(password, admin.passwordHash);

    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = {
      type: 'ADMIN',
      id: admin.id,
      role: admin.role,
      email: admin.email,
    };

    const token = this.jwtService.sign(payload);

    return {
      accessToken: token,
      admin: {
        id: admin.id,
        email: admin.email,
        role: admin.role,
      },
    };
  }
}
