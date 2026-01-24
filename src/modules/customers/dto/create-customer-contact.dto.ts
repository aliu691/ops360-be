import { IsOptional, IsString } from 'class-validator';

export class CreateCustomerContactDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  mobile?: string;
}
