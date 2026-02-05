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
    /**
     * payload example:
     * {
     *   sub: number,
     *   email: string,
     *   type: 'USER' | 'ADMIN',
     *   role?: 'ADMIN' | 'SUPER_ADMIN'
     * }
     */
    return payload; // attaches to req.user
  }
}
