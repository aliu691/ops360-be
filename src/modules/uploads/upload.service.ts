import {
  Injectable,
  BadRequestException,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import * as XLSX from 'xlsx';
import { CustomersService } from '../customers/customers.service';
import { MeetingsService } from '../meetings/meetings.service';
import { PipelineService } from '../pipeline/pipeline.service';
import { User } from '../users/users.entity';

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);

  @InjectRepository(User)
  private readonly userRepo: Repository<User>;

  constructor(
    private readonly meetingsService: MeetingsService,
    private readonly pipelineService: PipelineService,
    private readonly customersService: CustomersService,
  ) {}

  async processMeetingsFile(
    file: Express.Multer.File,
    context: {
      repName: string;
      reportingMonth: string; // YYYY-MM
      reportingWeek: number;
      userId: number;
      actorType: 'USER' | 'ADMIN';
    },
  ) {
    const { repName, reportingMonth, reportingWeek, userId, actorType } =
      context;

    /* ============================
     VALIDATION
  ============================ */
    if (!repName || !reportingMonth || reportingWeek === undefined) {
      throw new BadRequestException(
        'repName, reportingMonth and reportingWeek are required',
      );
    }

    if (!file || !file.buffer) {
      throw new BadRequestException('Uploaded file is missing or invalid');
    }

    /* ============================
     🔒 OWNERSHIP ENFORCEMENT
     USER can only upload their own data
  ============================ */
    if (actorType === 'USER') {
      const user = await this.userRepo.findOne({
        where: { id: userId },
        select: ['firstName'],
      });

      if (!user || user.firstName !== repName) {
        throw new ForbiddenException(
          'You are not allowed to upload meetings for another rep',
        );
      }
    }

    /* ============================
     READ EXCEL (BUFFER-BASED)
  ============================ */
    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];

    if (!sheetName) {
      throw new BadRequestException('Excel file contains no sheets');
    }

    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: null });

    if (rows.length < 2) {
      return { totalRows: 0 };
    }

    /* ============================
     HEADER MAPPING
  ============================ */
    const headerRow = rows[0] as Record<string, any>;
    const columnMap: Record<string, string> = {};

    for (const key of Object.keys(headerRow)) {
      const value = headerRow[key]?.toString().trim().toUpperCase();

      if (value === 'CLIENT NAME') columnMap.customerName = key;
      if (value === 'PRIMARY CONTACT') columnMap.primaryContact = key;
      if (value === 'PURPOSE OF MEETING') columnMap.meetingPurpose = key;
      if (value === 'OUTCOME') columnMap.meetingOutcome = key;
    }

    if (
      !columnMap.customerName ||
      !columnMap.primaryContact ||
      !columnMap.meetingPurpose ||
      !columnMap.meetingOutcome
    ) {
      throw new BadRequestException(
        'Invalid file format. Required columns: CLIENT NAME, PRIMARY CONTACT, PURPOSE OF MEETING, OUTCOME',
      );
    }

    /* ============================
     TRANSFORM ROWS
  ============================ */
    const meetings = rows.slice(1).map((row: any) => ({
      userId,
      repName,
      reportingMonth,
      reportingWeek,
      customerName: row[columnMap.customerName] || '',
      primaryContact: row[columnMap.primaryContact] || '',
      meetingPurpose: row[columnMap.meetingPurpose] || '',
      meetingOutcome: row[columnMap.meetingOutcome] || '',
    }));

    const filteredMeetings = meetings.filter(
      (m) => m.customerName && m.customerName.trim() !== '',
    );

    if (filteredMeetings.length === 0) {
      return { totalRows: 0 };
    }

    /* ============================
     SAVE (BULK)
  ============================ */
    await this.meetingsService.saveMeetings(filteredMeetings);

    return {
      totalRows: filteredMeetings.length,
      reporting: {
        repName,
        month: reportingMonth,
        week: reportingWeek,
      },
    };
  }

  async processPipelineFile(
    fileBuffer: Buffer,
    params: {
      salesOwnerId: number;
      year: number;
    },
  ) {
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });

    this.logger.log(
      `Processing pipeline upload | year=${params.year}, salesOwner=${params.salesOwnerId}`,
    );

    const quarterMap: Record<string, 1 | 2 | 3 | 4> = {
      Q1: 1,
      Q2: 2,
      Q3: 3,
      Q4: 4,
    };

    let processed = 0;

    for (const sheetName of workbook.SheetNames) {
      if (!quarterMap[sheetName]) continue;

      const quarter = quarterMap[sheetName];
      const sheet = workbook.Sheets[sheetName];

      this.logger.log(`Processing sheet "${sheetName}" as Q${quarter}`);

      const rows = XLSX.utils.sheet_to_json<any[]>(sheet, {
        header: 1,
        defval: null,
        blankrows: false,
      });

      // ✅ HEADER ROW (A1)
      const headerRow = rows[0];
      if (!headerRow) {
        this.logger.warn(`No header row found in ${sheetName}`);
        continue;
      }

      const col = buildColumnIndex(headerRow);
      this.logger.log(`Detected columns for ${sheetName}`, col);

      // 🛑 Safety guard
      if (Object.keys(col).length === 0) {
        this.logger.warn(`No columns detected for ${sheetName}`);
        continue;
      }

      // ✅ DATA ROWS START AT ROW 2 (index 1)
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];

        if (!row || !row[col.organization]) break;

        const organizationName = row[col.organization];
        const opportunity = row[col.opportunity];
        const stageRaw = row[col.stage];

        // 🚫 Skip TOTAL rows
        if (
          typeof organizationName === 'string' &&
          organizationName.toUpperCase().startsWith('TOTAL')
        ) {
          continue;
        }

        if (!opportunity || !stageRaw) continue;

        const dealValue =
          typeof row[col.amount] === 'number'
            ? row[col.amount]
            : Number(row[col.amount]?.toString().replace(/,/g, '')) || 0;

        const expectedCloseDate = parseExpectedCloseDate(
          row[col.expectedClose],
        );

        const presalesEmails =
          typeof row[col.presales] === 'string'
            ? row[col.presales]
                .split(',')
                .map((e) => e.trim().toLowerCase())
                .filter(Boolean)
            : [];

        const preSalesOwners =
          presalesEmails.length > 0
            ? await this.userRepo.find({
                where: { email: In(presalesEmails) },
              })
            : [];

        await this.pipelineService.upsertFromExcel({
          organizationName: organizationName.toString().trim(),
          dealName: opportunity.toString().trim(),
          dealValueExcel: dealValue,
          stageKey: normalizeStage(stageRaw.toString()),
          salesOwnerId: params.salesOwnerId,
          preSalesOwners,
          expectedCloseDate,
          nextAction:
            typeof row[col.nextAction] === 'string'
              ? row[col.nextAction].trim()
              : undefined,
          redFlag:
            typeof row[col.redFlag] === 'string'
              ? row[col.redFlag].trim()
              : undefined,
          year: params.year,
          quarterRaw: `Q${quarter}`,
        });

        processed++;
      }
    }

    this.logger.log(
      `Pipeline import completed. Total rows processed: ${processed}`,
    );

    return { totalRows: processed };
  }

  async processCustomersFile(file: Express.Multer.File) {
    console.log('📥 Starting customer upload processing');
    console.log('📄 File received:', {
      originalname: file?.originalname,
      mimetype: file?.mimetype,
      size: file?.size,
      hasBuffer: !!file?.buffer,
    });

    // 🔒 HARD GUARD — prevents XLSX crash
    if (!file || !file.buffer) {
      throw new BadRequestException(
        'No file uploaded or file buffer missing. Ensure multipart/form-data with key "file".',
      );
    }

    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];

    const rows = XLSX.utils.sheet_to_json<{
      ORGANIZATION: string | null;
      'CONTACT PERSON': string | null;
      EMAIL: string | null;
      'MOBILE NO.': string | null;
    }>(sheet, { defval: null });

    console.log(`📄 Parsed ${rows.length} rows from Excel`);

    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      const row = rows[rowIndex];

      const customerName = toOptionalString(row.ORGANIZATION);

      if (!customerName) {
        console.log(`⏭️  Row ${rowIndex + 1}: skipped (no organization)`);
        continue;
      }

      /** -----------------------------
       * 1️⃣ Find or create customer
       ------------------------------*/
      const customer =
        await this.customersService.findOrCreateCustomerByName(customerName);

      /** -----------------------------
       * 2️⃣ Parse contacts
       ------------------------------*/
      const names = row['CONTACT PERSON']
        ? String(row['CONTACT PERSON'])
            .split(/\n|,/)
            .map((v) => v.trim())
            .filter(Boolean)
        : [];

      const emails = row.EMAIL
        ? String(row.EMAIL)
            .split(/\n|,/)
            .map((v) => v.trim())
        : [];

      const mobiles = row['MOBILE NO.']
        ? String(row['MOBILE NO.'])
            .split(/\n|,/)
            .map((v) => v.trim())
        : [];

      /** -----------------------------
       * 3️⃣ Create contacts
       ------------------------------*/
      for (let i = 0; i < names.length; i++) {
        await this.customersService.addCustomerContact({
          customer,
          name: toOptionalString(names[i]),
          email: toOptionalString(emails[i]),
          mobile: toOptionalString(mobiles[i]),
        });
      }
    }

    console.log('✅ Customer upload processing completed');

    return {
      success: true,
      message: 'Customers added successfully',
    };
  }
}

function toOptionalString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function buildColumnIndex(headerRow: any[]) {
  const index: Record<string, number> = {};

  headerRow.forEach((cell, i) => {
    if (!cell) return;

    const key = cell.toString().trim().toLowerCase();

    if (key.includes('organization')) index.organization = i;
    if (key === 'opportunity') index.opportunity = i;
    if (key.includes('deal stage')) index.stage = i;
    if (key.includes('amount')) index.amount = i;
    if (key.includes('presales')) index.presales = i;
    if (key.includes('expected')) index.expectedClose = i;
    if (key.includes('next action')) index.nextAction = i;
    if (key.includes('red flag')) index.redFlag = i;
  });

  return index;
}

function parseExpectedCloseDate(value: any): Date | null {
  if (!value) return null;

  // Excel serial number
  if (typeof value === 'number') {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const date = new Date(excelEpoch.getTime() + value * 86400000);
    return isNaN(date.getTime()) ? null : date;
  }

  // Already a Date
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }

  // String date
  const parsed = new Date(value);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeStage(raw: string): string {
  const value = raw.trim().toUpperCase();

  if (value.includes('CLOSE') && value.includes('WON')) return 'CLOSE_WON';
  if (value.includes('CLOSE') && value.includes('LOST')) return 'CLOSE_LOST';
  if (value.includes('PROPOSAL')) return 'PROPOSAL_SUBMITTED';
  if (value.includes('NEGOTIATION')) return 'NEGOTIATION_DONE';
  if (value.includes('NEED')) return 'NEEDS_DEFINED';
  if (value.includes('QUALIFIED')) return 'QUALIFIED_OPPORTUNITY';

  throw new BadRequestException(`Invalid deal stage: ${raw}`);
}
