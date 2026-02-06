import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { CreateCustomerContactDto } from './create-customer-contact.dto';

export class CreateCustomerDto {
  name: string;
  @IsOptional()
  @IsArray()
  contacts?: CreateCustomerContactDto[];
}
