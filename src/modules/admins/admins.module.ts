import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { Admin } from './admins.entity';
import { AdminInvite } from './admins_invites.entity';
import { AdminsService } from './admins.service';
import { AdminsController } from './admins.controller';
import { JwtStrategy } from '../auth/jwt.strategy';

@Module({
  imports: [
    TypeOrmModule.forFeature([Admin, AdminInvite]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    ConfigModule,

    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '8h' },
      }),
    }),
  ],
  controllers: [AdminsController],
  providers: [AdminsService, JwtStrategy],
  exports: [AdminsService, JwtModule],
})
export class AdminsModule {}
