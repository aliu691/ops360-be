import { Module } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { MeetingsModule } from '../meetings/meetings.module';
import { MulterModule } from '@nestjs/platform-express';

@Module({
  imports: [
    MulterModule.register({
      dest: './uploads', // local folder storage
    }),
    MeetingsModule, // so upload service can save meetings
  ],
  controllers: [UploadController],
  providers: [UploadService],
})
export class UploadsModule {}
