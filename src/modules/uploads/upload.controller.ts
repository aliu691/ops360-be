import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';

@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('meetings')
  @UseInterceptors(FileInterceptor('file'))
  async uploadMeetings(
    @Query('repName') repName: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    console.log('RECIEVED REP:', repName);
    console.log('RECIEVED FILE:', file);

    if (!repName) {
      throw new BadRequestException('repName is missing');
    }

    if (!file) {
      throw new BadRequestException('file is missing');
    }

    // MUST be inside an async function
    const result = await this.uploadService.processMeetingsFile(
      file.path,
      repName,
    );

    return {
      success: true,
      message: 'File processed successfully',
      totalRows: result.totalRows,
    };
  }
}
