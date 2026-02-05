import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { Admin } from './admins.entity';
import { AdminInvite } from './admins_invites.entity';
import { AdminsService } from './admins.service';
import { AdminsController } from './admins.controller';
import { EmailModule } from '../email/email.modules';
import { AdminPasswordReset } from './admins_password_resets.entity';
import { JwtStrategy } from '../auth/strategies/jwt-stategy';
import { AuthIdentity } from '../auth/auth.entity';
import { JwtSignOptions } from '@nestjs/jwt';

@Module({
  imports: [
    TypeOrmModule.forFeature([Admin, AdminInvite, AuthIdentity]),
    ConfigModule,

    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const expiresIn =
          config.get<JwtSignOptions['expiresIn']>('USER_JWT_EXPIRES_IN') ??
          '7d';

        return {
          secret: config.get<string>('USER_JWT_SECRET')!,
          signOptions: {
            expiresIn,
          },
        };
      },
    }),
    EmailModule,
  ],
  controllers: [AdminsController],
  providers: [AdminsService, JwtStrategy],
  exports: [AdminsService, JwtModule],
})
export class AdminsModule {}
