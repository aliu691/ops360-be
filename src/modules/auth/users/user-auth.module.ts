import { forwardRef, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { UserAuthService } from './user-auth.service';
import { UserAuthController } from './user-auth.controller';
import { UserPasswordReset } from './user-password-reset.entity';
import { EmailModule } from 'src/modules/email/email.modules';
import { AuthPasswordReset } from '../auth_password_resets';
import { AuthIdentity } from '../auth.entity';
import { UsersModule } from 'src/modules/users/users.module';
import { AdminsModule } from 'src/modules/admins/admins.module';
import { JwtStrategy } from '../strategies/jwt-stategy';
import { JwtSignOptions } from '@nestjs/jwt';
import { Admin } from 'src/modules/admins/admins.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AuthPasswordReset,
      AuthIdentity,
      UserPasswordReset,
      Admin,
    ]),

    forwardRef(() => UsersModule),
    forwardRef(() => AdminsModule),

    ConfigModule,
    EmailModule,

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
  ],
  providers: [UserAuthService, JwtStrategy],
  controllers: [UserAuthController],
  exports: [UserAuthService],
})
export class UserAuthModule {}
