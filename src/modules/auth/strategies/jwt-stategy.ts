import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false, // ✅ important
      secretOrKey: config.get<string>('USER_JWT_SECRET'), // ✅ unchanged
    });
  }

  async validate(payload: any) {
    return {
      id: payload.sub, // ✅ normalize here
      type: payload.type,
      role: payload.role,
      email: payload.email,
    };
  }
}
