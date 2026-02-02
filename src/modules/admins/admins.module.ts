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
import { AdminJwtStrategy } from '../auth/admin-jwt.strategy';

@Module({
  imports: [
    TypeOrmModule.forFeature([Admin, AdminInvite, AdminPasswordReset]),
    PassportModule.register({ defaultStrategy: 'admin-jwt' }),
    ConfigModule,

    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('ADMIN_JWT_SECRET'),
        signOptions: { expiresIn: '8h' },
      }),
    }),
    EmailModule,
  ],
  controllers: [AdminsController],
  providers: [AdminsService, AdminJwtStrategy],
  exports: [AdminsService, JwtModule],
})
export class AdminsModule {}
