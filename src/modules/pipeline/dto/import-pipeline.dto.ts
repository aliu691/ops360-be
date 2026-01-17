import { IsString, IsOptional, IsInt, IsNumber, Min } from 'class-validator';

export class ImportPipelineDealDto {
  /* -----------------------------
       Core Deal Info
    ------------------------------*/
  @IsString()
  organizationName: string;

  @IsString()
  dealName: string;

  /* -----------------------------
       Deal Value
    ------------------------------*/
  @IsNumber()
  @Min(0)
  dealValueExcel: number;

  /* -----------------------------
       Stage
    ------------------------------*/
  @IsString()
  stageKey: string;

  /* -----------------------------
       Ownership
    ------------------------------*/
  @IsInt()
  salesOwnerId: number;

  @IsOptional()
  @IsInt()
  preSalesOwnerId?: number;

  /* -----------------------------
       Dates & Notes
    ------------------------------*/
  @IsOptional()
  expectedCloseDate?: Date | null;

  @IsOptional()
  @IsString()
  nextAction?: string;

  /**
   * Free-text blocker / risk
   */
  @IsOptional()
  @IsString()
  redFlag?: string | null;

  /* -----------------------------
       Time Bucketing
    ------------------------------*/
  @IsInt()
  year: number;

  quarterRaw: string | number;
}
