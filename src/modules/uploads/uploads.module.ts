import { Module } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { MeetingsModule } from '../meetings/meetings.module';
import { MulterModule } from '@nestjs/platform-express';
import { UsersModule } from '../users/users.module';
import { PipelineModule } from '../pipeline/pipeline.module';
import { User } from '../users/users.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomersModule } from '../customers/customers.module';
import { memoryStorage } from 'multer';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    MeetingsModule,
    PipelineModule,
    UsersModule,
    CustomersModule,
    MulterModule.register({
      dest: './uploads', // local folder storage
      storage: memoryStorage(), // 🔥 THIS IS THE FIX
      limits: {
        fileSize: 10 * 1024 * 1024, // optional: 10MB
      },
    }),
    MeetingsModule, // so upload service can save meetings
    UsersModule,
  ],
  controllers: [UploadController],
  providers: [UploadService],
})
export class UploadsModule {}
