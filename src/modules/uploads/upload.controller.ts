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
    @Query('salesOwnerId') salesOwnerId: string,
    @Query('month') month: string,
    @Query('week') week?: string,
  ) {
    if (!salesOwnerId) {
      throw new BadRequestException('salesOwnerId is missing');
    }

    if (!month) {
      throw new BadRequestException('reporting month is required (YYYY-MM)');
    }

    if (!week) {
      throw new BadRequestException('reporting week is required');
    }

    const parsedSalesOwnerId = Number(salesOwnerId);
    const reportingWeek = Number(week);

    if (Number.isNaN(parsedSalesOwnerId)) {
      throw new BadRequestException('salesOwnerId must be a number');
    }

    if (Number.isNaN(reportingWeek)) {
      throw new BadRequestException('week must be a valid number');
    }

    if (!file) {
      throw new BadRequestException('file is missing');
    }

    // 🔍 Resolve user from ID
    const user = await this.usersService.findById(parsedSalesOwnerId);

    if (!user) {
      throw new BadRequestException(
        `User with id ${parsedSalesOwnerId} not found`,
      );
    }

    /* ============================
     🔒 OWNERSHIP ENFORCEMENT
  ============================ */
    if (req.user.type === 'USER' && req.user.id !== user.id) {
      throw new ForbiddenException(
        'You cannot upload meetings for another user',
      );
    }

    const result = await this.uploadService.processMeetingsFile(file, {
      repName: user.firstName, // ✅ derived, trusted
      reportingMonth: month,
      reportingWeek,
      userId: user.id, // ✅ canonical
      actorType: req.user.type,
    });

    return {
      success: true,
      message: 'File processed successfully',
      totalRows: result.totalRows,
      reporting: {
        repName: user.firstName,
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
