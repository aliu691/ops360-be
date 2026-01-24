import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';
import { CreateCustomerContactDto } from './create-customer-contact.dto';

export class CreateCustomerContactsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCustomerContactDto)
  contacts: CreateCustomerContactDto[];
}
