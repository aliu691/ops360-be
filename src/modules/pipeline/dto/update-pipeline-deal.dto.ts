// update-pipeline-deal.dto.ts
import {
  IsInt,
  IsOptional,
  IsString,
  IsArray,
  IsDateString,
  Min,
} from 'class-validator';

export class UpdatePipelineDealDto {
  @IsOptional()
  @IsInt()
  customerId?: number;

  @IsOptional()
  @IsString()
  dealName?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  dealValue?: number;

  @IsOptional()
  @IsInt()
  stageId?: number;

  @IsOptional()
  @IsInt()
  salesOwnerId?: number;

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
