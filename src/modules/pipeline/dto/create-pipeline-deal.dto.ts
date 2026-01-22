// create-pipeline-deal.dto.ts
import {
  IsInt,
  IsOptional,
  IsString,
  IsArray,
  IsDateString,
  Min,
} from 'class-validator';

export class CreatePipelineDealDto {
  @IsString()
  organizationName: string;

  @IsString()
  dealName: string;

  @IsInt()
  @Min(0)
  dealValue: number;

  @IsInt()
  stageId: number;

  @IsInt()
  salesOwnerId: number;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  preSalesOwnerIds?: number[];

  @IsOptional()
  @IsDateString()
  expectedCloseDate?: string;

  @IsOptional()
  @IsString()
  nextAction?: string;

  @IsOptional()
  @IsString()
  redFlag?: string;
}
