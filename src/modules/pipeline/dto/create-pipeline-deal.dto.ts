import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreatePipelineDealDto {
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
  @IsInt()
  preSalesOwnerId?: number;

  @IsOptional()
  @IsString()
  expectedCloseDate?: string;
}
