import { IsArray, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreatePipelineDealDto {
  @IsString()
  organizationName: string;

  @IsString()
  dealName: string;

  @IsInt()
  @Min(0)
  dealValueExcel: number;

  @IsInt()
  stageId: number;

  @IsInt()
  salesOwnerId: number;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  preSalesOwnerIds?: number[];

  @IsOptional()
  @IsString()
  expectedCloseDate?: string;

  @IsOptional()
  @IsString()
  nextAction?: string;

  @IsOptional()
  @IsString()
  redFlag?: string;
}
