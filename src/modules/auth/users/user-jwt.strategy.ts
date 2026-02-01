import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UserJwtStrategy extends PassportStrategy(Strategy, 'user-jwt') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.get<string>('USER_JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    // 🔴 ADD THIS LOG
    console.log('🟢 USER JWT PAYLOAD:', payload);

    return {
      id: payload.sub,
      email: payload.email,
      department: payload.department,
      type: payload.type,
    };
  }
}
