import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { MeetingsService } from '../meetings/meetings.service';
import { PipelineService } from '../pipeline/pipeline.service';

const FALLBACK_HEADER_MAP: Record<string, string> = {
  __EMPTY: 'Organization Name',
  __EMPTY_1: 'Opportunity',
  __EMPTY_2: 'Deal Stage',
  __EMPTY_3: 'Amount (NGN)',
  __EMPTY_4: 'Expected close date',
  __EMPTY_5: 'Next Action',
  __EMPTY_6: 'RED FLAG',
};

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);

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

  /* ===============================
     PIPELINE EXCEL IMPORT
  ===============================*/
  async processPipelineFile(
    filePath: string,
    params: {
      salesOwnerId: number;
      preSalesOwnerId?: number;
      year: number;
    },
  ) {
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    this.logger.log(
      `Processing pipeline file: ${filePath} | year=${params.year}, salesOwner=${params.salesOwnerId}, preSales=${params.preSalesOwnerId}`,
    );

    // ✅ READ AS RAW ROWS
    const rows = XLSX.utils.sheet_to_json<any[]>(sheet, {
      header: 1,
      defval: null,
    });
    this.logger.log(`Parsed ${rows.length} raw rows from Excel`);

    if (!rows.length) {
      throw new BadRequestException('Empty pipeline file');
    }

    // ✅ FIND HEADER ROW
    const headerRow = rows.find((r) => r.includes('Organization Name'));

    if (!headerRow) {
      throw new BadRequestException('Pipeline header row not found');
    }

    // ✅ MAP COLUMN INDEXES
    const col = {
      organization: headerRow.indexOf('Organization Name'),
      opportunity: headerRow.indexOf('Opportunity'),
      stage: headerRow.indexOf('Deal Stage'),
      amount: headerRow.indexOf('Amount (NGN)'),
      expectedClose: headerRow.indexOf('Expected close date'),
      nextAction: headerRow.indexOf('Next Action'),
      redFlag: headerRow.indexOf('RED FLAG'),
    };

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

      const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, {
        defval: null,
      });

      this.logger.log(`Processing sheet ${sheetName} with ${rows.length} rows`);

      for (const rawRow of rows) {
        const row = normalizeRow(rawRow);

        // 🛑 SKIP HEADER ROWS (CRITICAL)
        if (
          row['Organization Name'] === 'Organization Name' ||
          row['Deal Stage'] === 'Deal Stage'
        ) {
          this.logger.debug('Skipping header row', row);
          continue;
        }

        const organizationName = row['Organization Name'];
        const opportunity = row['Opportunity'];
        const stageRaw = row['Deal Stage'];

        if (!organizationName || !opportunity || !stageRaw) {
          this.logger.debug('Skipping invalid row', row);
          continue;
        }

        const dealValue =
          Number(row['Amount (NGN)']?.toString().replace(/,/g, '')) || 0;

        const expectedCloseDate = parseExpectedCloseDate(
          row['Expected close date'],
          params.year,
          quarter,
        );

        await this.pipelineService.upsertFromExcel({
          organizationName,
          dealName: opportunity,

          dealValueExcel: Number.isFinite(dealValue) ? dealValue : 0,

          stageKey: normalizeStage(stageRaw),

          salesOwnerId: params.salesOwnerId,
          preSalesOwnerId: params.preSalesOwnerId,

          expectedCloseDate,

          nextAction:
            typeof row['Next Action'] === 'string'
              ? row['Next Action'].trim()
              : undefined,

          redFlag: normalizeRedFlag(row['RED FLAG']),

          year: params.year,
          quarterRaw: `Q${quarter}`,
        });

        processed++;
      }
    }

    return { totalRows: processed };
  }
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

function parseAmount(value: any): number | null {
  if (!value) return null;

  const cleaned = value
    .toString()
    .replace(/[₦,\s]/g, '')
    .trim();

  if (cleaned === '' || cleaned === '-' || isNaN(Number(cleaned))) {
    return null;
  }

  return Number(cleaned);
}

function parseExpectedCloseDate(
  value: any,
  year: number,
  quarter: 1 | 2 | 3 | 4,
): Date | null {
  if (!value) return null;

  // Excel serial date (number)
  if (typeof value === 'number') {
    // Excel epoch starts at 1899-12-30
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const date = new Date(excelEpoch.getTime() + value * 86400000);

    return isNaN(date.getTime()) ? null : date;
  }

  // Try normal date parsing
  const parsed = new Date(value);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeRedFlag(value: any): string | null {
  if (typeof value !== 'string') return null;

  const text = value.trim();
  if (!text) return null;

  // Kill legacy boolean-like values
  if (['open', 'closed', 'yes', 'no'].includes(text.toLowerCase())) {
    return null;
  }

  return text;
}

function normalizeRow(row: Record<string, any>) {
  if (!row['Organization Name'] && row.__EMPTY) {
    const normalized: Record<string, any> = {};

    for (const key of Object.keys(row)) {
      const mappedKey = FALLBACK_HEADER_MAP[key];
      if (mappedKey) {
        normalized[mappedKey] = row[key];
      }
    }

    return normalized;
  }

  return row;
}
