import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateUserDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  weeklySalesTarget?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
