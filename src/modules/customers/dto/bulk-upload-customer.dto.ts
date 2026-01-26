import { CreateCustomerContactDto } from './create-customer-contact.dto';

export class BulkUploadCustomerDto {
  name: string;
  contacts?: CreateCustomerContactDto[];
}
