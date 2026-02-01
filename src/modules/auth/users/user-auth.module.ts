import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { UserAuthService } from './user-auth.service';
import { UserAuthController } from './user-auth.controller';
import { User } from 'src/modules/users/users.entity';
import { UserJwtStrategy } from './user-jwt.strategy';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('USER_JWT_SECRET')!,
        signOptions: {
          expiresIn: Number(config.get('USER_JWT_EXPIRES_IN_SECONDS', 604800)),
        },
      }),
    }),
  ],
  providers: [UserAuthService, UserJwtStrategy],
  controllers: [UserAuthController],
  exports: [JwtModule],
})
export class UserAuthModule {}
