// auth/strategies/admin-jwt.strategy.ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AdminJwtStrategy extends PassportStrategy(Strategy, 'admin-jwt') {
  constructor(config: ConfigService) {
    const secret = config.get<string>('ADMIN_JWT_SECRET');

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: secret,
    });
  }

  async validate(payload: any) {
    return {
      type: 'ADMIN',
      id: payload.id,
      role: payload.role,
      email: payload.email,
    };
  }
}
