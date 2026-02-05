// src/users/users.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User } from './users.entity';
import { UserAuthModule } from '../auth/users/user-auth.module';
import { AuthIdentity } from '../auth/auth.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, AuthIdentity]), UserAuthModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
