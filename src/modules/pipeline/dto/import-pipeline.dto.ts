import {
  IsString,
  IsOptional,
  IsInt,
  IsNumber,
  Min,
  IsArray,
} from 'class-validator';
import { User } from 'src/modules/users/users.entity';

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
  preSalesOwners?: User[];

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  preSalesOwnerIds?: number[];

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
