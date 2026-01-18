import { Module } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { MeetingsModule } from '../meetings/meetings.module';
import { MulterModule } from '@nestjs/platform-express';
import { UsersModule } from '../users/users.module';
import { PipelineModule } from '../pipeline/pipeline.module';
import { User } from '../users/users.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    MeetingsModule,
    PipelineModule,
    UsersModule,
    MulterModule.register({
      dest: './uploads', // local folder storage
    }),
    MeetingsModule, // so upload service can save meetings
    UsersModule,
  ],
  controllers: [UploadController],
  providers: [UploadService],
})
export class UploadsModule {}
