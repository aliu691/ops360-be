import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import * as XLSX from 'xlsx';
import { MeetingsService } from '../meetings/meetings.service';
import { PipelineService } from '../pipeline/pipeline.service';
import { User } from '../users/users.entity';

// const FALLBACK_HEADER_MAP: Record<string, string> = {
//   __EMPTY: 'Organization Name',
//   __EMPTY_1: 'Opportunity',
//   __EMPTY_2: 'Deal Stage',
//   __EMPTY_3: 'Amount (NGN)',
//   __EMPTY_4: 'Expected close date',
//   __EMPTY_5: 'Next Action',
//   __EMPTY_6: 'RED FLAG',
// };

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);

  @InjectRepository(User)
  private readonly userRepo: Repository<User>;

  constructor(
    private readonly meetingsService: MeetingsService,
    private readonly pipelineService: PipelineService,
  ) {}

  async processMeetingsFile(
    filePath: string,
    context: {
      repName: string;
      reportingMonth: string; // YYYY-MM
      reportingWeek: number;
      userId: number;
    },
  ) {
    const { repName, reportingMonth, reportingWeek } = context;

    if (!repName || !reportingMonth || reportingWeek === undefined) {
      throw new BadRequestException(
        'repName, reportingMonth and reportingWeek are required',
      );
    }

    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    const rows = XLSX.utils.sheet_to_json(sheet, { defval: null });

    console.log('DEBUG ROWS (first 5):', rows.slice(0, 5));

    if (rows.length < 2) {
      return { totalRows: 0 };
    }

    // Header row
    const headerRow = rows[0] as Record<string, any>;
    const columnMap: Record<string, string> = {};

    for (const key of Object.keys(headerRow)) {
      const value = headerRow[key]?.toString().trim().toUpperCase();

      if (value === 'CLIENT NAME') columnMap.customerName = key;
      if (value === 'PRIMARY CONTACT') columnMap.primaryContact = key;
      if (value === 'PURPOSE OF MEETING') columnMap.meetingPurpose = key;
      if (value === 'OUTCOME') columnMap.meetingOutcome = key;
    }

    console.log('COLUMN MAP:', columnMap);

    // Validate required columns
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

    const meetings = rows.slice(1).map((row: any) => ({
      userId: context.userId,
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

    // 🚨 THIS CALL IS WHERE TIMEOUT HAPPENS IF IMPLEMENTED WRONG
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
    filePath: string,
    params: {
      salesOwnerId: number;
      year: number;
    },
  ) {
    const workbook = XLSX.readFile(filePath);

    this.logger.log(
      `Processing pipeline file: ${filePath} | year=${params.year}, salesOwner=${params.salesOwnerId}`,
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

function detectQuarter(sheetName: string): 1 | 2 | 3 | 4 | null {
  const normalized = sheetName.trim().toUpperCase();

  if (normalized.includes('Q1')) return 1;
  if (normalized.includes('Q2')) return 2;
  if (normalized.includes('Q3')) return 3;
  if (normalized.includes('Q4')) return 4;

  return null;
}

// function normalizeRedFlag(value: any): string | null {
//   if (typeof value !== 'string') return null;

//   const text = value.trim();
//   if (!text) return null;

//   // Kill legacy boolean-like values
//   if (['open', 'closed', 'yes', 'no'].includes(text.toLowerCase())) {
//     return null;
//   }

//   return text;
// }

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
