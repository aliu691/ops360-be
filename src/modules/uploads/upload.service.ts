import { Injectable, BadRequestException } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { MeetingsService } from '../meetings/meetings.service';

@Injectable()
export class UploadService {
  constructor(private readonly meetingsService: MeetingsService) {}

  async processMeetingsFile(
    filePath: string,
    context: {
      repName: string;
      reportingMonth: string; // YYYY-MM
      reportingWeek: number; // e.g. 49
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

    if (rows.length === 0) {
      return { totalRows: 0 };
    }

    // Row 1 contains header titles
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

    const meetings = rows.slice(1).map((row: any) => ({
      repName,
      reportingMonth,
      reportingWeek,
      customerName: row[columnMap.customerName] || '',
      primaryContact: row[columnMap.primaryContact] || '',
      meetingPurpose: row[columnMap.meetingPurpose] || '',
      meetingOutcome: row[columnMap.meetingOutcome] || '',
    }));

    // Remove empty rows
    const filteredMeetings = meetings.filter(
      (m) => m.customerName && m.customerName.trim() !== '',
    );

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
}
