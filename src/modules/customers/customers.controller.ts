import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { CreateCustomerContactDto } from './dto/create-customer-contact.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { UpdateCustomerContactDto } from './dto/update-customer-contact.dto';
import { CreateCustomerContactsDto } from './dto/create-customer-contacts.dto';

@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  /* ======================
   * CUSTOMER
   * ====================== */

  @Post()
  createCustomer(@Body() dto: CreateCustomerDto) {
    return this.customersService.createCustomer(dto);
  }

  @Patch(':id')
  updateCustomer(@Param('id') id: number, @Body() dto: UpdateCustomerDto) {
    return this.customersService.updateCustomer(id, dto);
  }

  @Get()
  getAllCustomers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.customersService.getAllCustomers(
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
    );
  }

  @Get(':id')
  getCustomerById(@Param('id') id: number) {
    return this.customersService.getCustomerById(id);
  }

  /* ======================
   * CUSTOMER CONTACT
   * ====================== */

  @Post(':customerId/contacts')
  createCustomerContacts(
    @Param('customerId', ParseIntPipe) customerId: number,
    @Body() dto: CreateCustomerContactsDto,
  ) {
    return this.customersService.createCustomerContacts(customerId, dto);
  }

  @Patch('contacts/:id')
  updateCustomerContact(
    @Param('id') id: number,
    @Body() dto: UpdateCustomerContactDto,
  ) {
    return this.customersService.updateCustomerContact(id, dto);
  }
}
