import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Query,
  BadRequestException,
  Req,
  ForbiddenException,
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
    @Req() req,
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

    const reportingWeek = Number(week);
    if (Number.isNaN(reportingWeek)) {
      throw new BadRequestException('week must be a valid number');
    }

    if (!file) {
      throw new BadRequestException('file is missing');
    }

    const user = await this.usersService.findByName(repName);

    if (!user) {
      throw new BadRequestException(`User '${repName}' not found`);
    }

    /* ============================
     🔒 OWNERSHIP (EXTRA SAFETY)
  ============================ */
    if (req.user.type === 'USER' && req.user.id !== user.id) {
      throw new ForbiddenException(
        'You cannot upload meetings for another user',
      );
    }

    const result = await this.uploadService.processMeetingsFile(file, {
      repName,
      reportingMonth: month,
      reportingWeek,
      userId: req.user.id,
      actorType: req.user.type,
    });

    return {
      success: true,
      message: 'File processed successfully',
      totalRows: result.totalRows,
      reporting: {
        repName,
        month,
        week: reportingWeek,
      },
    };
  }

  @Post('pipeline')
  @UseInterceptors(FileInterceptor('file'))
  async uploadPipeline(
    @UploadedFile() file: Express.Multer.File,
    @Query('salesOwnerId') salesOwnerId?: string,
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
    const parsedYear = Number(year);

    if (Number.isNaN(parsedSalesOwnerId)) {
      throw new BadRequestException('salesOwnerId must be a number');
    }

    if (Number.isNaN(parsedYear)) {
      throw new BadRequestException('year must be a number');
    }

    const result = await this.uploadService.processPipelineFile(
      file.buffer, // ✅ CHANGE HERE
      {
        salesOwnerId: parsedSalesOwnerId,
        year: parsedYear,
      },
    );

    return {
      success: true,
      message: 'Pipeline uploaded successfully',
      totalRows: result.totalRows,
    };
  }

  @Post('customers')
  @UseInterceptors(FileInterceptor('file'))
  async uploadCustomers(@UploadedFile() file: Express.Multer.File) {
    return this.uploadService.processCustomersFile(file);
  }
}
