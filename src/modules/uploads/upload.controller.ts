import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';
import { Express } from 'express';

@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('meetings')
  @UseInterceptors(FileInterceptor('file'))
  async uploadMeetings(
    @UploadedFile() file: Express.Multer.File,
    @Body('repName') repName: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    if (!repName) {
      throw new BadRequestException('repName is required');
    }

    const result = await this.uploadService.processMeetingsFile(
      file.path,
      repName,
    );

    return {
      message: 'File processed successfully',
      ...result,
    };
  }
}
