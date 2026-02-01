import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AdminsModule } from '../admins/admins.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AdminJwtStrategy } from './admin-jwt.strategy';

@Module({
  imports: [
    AdminsModule,
    PassportModule,
    ConfigModule,

    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('ADMIN_JWT_SECRET'),
        signOptions: { expiresIn: '12h' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, AdminJwtStrategy],
  exports: [JwtModule],
})
export class AuthModule {}
