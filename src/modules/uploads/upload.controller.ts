import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from '../users/users.service';
import { UploadService } from './upload.service';

@Controller('upload')
export class UploadController {
  constructor(
    private readonly uploadService: UploadService,
    private readonly usersService: UsersService,
  ) {}

  @Post('meetings')
  @UseInterceptors(FileInterceptor('file'))
  async uploadMeetings(
    @UploadedFile() file: Express.Multer.File,
    @Query('repName') repName: string,
    @Query('month') month: string, // YYYY-MM
    @Query('week') week?: string, // number as string from query
  ) {
    console.log('RECEIVED REP:', repName);
    console.log('RECEIVED MONTH:', month);
    console.log('RECEIVED WEEK:', week);
    console.log('RECEIVED FILE:', file?.originalname);

    if (!repName) {
      throw new BadRequestException('repName is missing');
    }

    if (!month) {
      throw new BadRequestException('reporting month is required (YYYY-MM)');
    }

    if (!week) {
      throw new BadRequestException('reporting week is required');
    }

    const weekNumber = Number(week);
    if (Number.isNaN(weekNumber)) {
      throw new BadRequestException('week must be a valid number');
    }

    if (!file) {
      throw new BadRequestException('file is missing');
    }

    const user = await this.usersService.findByName(repName);

    if (!user) {
      throw new BadRequestException(`User '${repName}' not found`);
    }

    const result = await this.uploadService.processMeetingsFile(file.path, {
      repName,
      reportingMonth: month,
      reportingWeek: weekNumber,
      userId: user.id,
    });

    return {
      success: true,
      message: 'File processed successfully',
      totalRows: result.totalRows,
      reporting: {
        repName,
        month,
        week: weekNumber,
      },
    };
  }

  @Post('pipeline')
  @UseInterceptors(FileInterceptor('file'))
  async uploadPipeline(
    @UploadedFile() file: Express.Multer.File,

    @Query('salesOwnerId') salesOwnerId?: string,
    @Query('preSalesOwnerId') preSalesOwnerId?: string,
    @Query('year') year?: string,
  ) {
    if (!file) {
      throw new BadRequestException('file is missing');
    }

    if (!salesOwnerId) {
      throw new BadRequestException('salesOwnerId is required');
    }

    if (!year) {
      throw new BadRequestException('year is required');
    }

    const parsedSalesOwnerId = Number(salesOwnerId);
    const parsedPreSalesOwnerId = preSalesOwnerId
      ? Number(preSalesOwnerId)
      : undefined;
    const parsedYear = Number(year);

    if (Number.isNaN(parsedSalesOwnerId)) {
      throw new BadRequestException('salesOwnerId must be a number');
    }

    if (preSalesOwnerId && Number.isNaN(parsedPreSalesOwnerId)) {
      throw new BadRequestException('preSalesOwnerId must be a number');
    }

    if (Number.isNaN(parsedYear)) {
      throw new BadRequestException('year must be a number');
    }

    const result = await this.uploadService.processPipelineFile(file.path, {
      salesOwnerId: parsedSalesOwnerId,
      preSalesOwnerId: parsedPreSalesOwnerId,
      year: parsedYear,
    });

    return {
      success: true,
      message: 'Pipeline uploaded successfully',
      totalRows: result.totalRows,
    };
  }
}
