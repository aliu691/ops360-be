import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Comment } from './comments.entity';
import { PipelineDeal } from '../pipeline/pipeline-deal.entity';

import { CommentsService } from './comments.service';
import { CommentsController } from './comments.controller';
import { EmailModule } from '../email/email.modules';
import { UsersModule } from '../users/users.module';
import { AdminsModule } from '../admins/admins.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Comment, PipelineDeal]),
    EmailModule,
    UsersModule,
    AdminsModule,
  ],
  controllers: [CommentsController],
  providers: [CommentsService],
})
export class CommentsModule {}
