import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Customer } from './customer.entity';
import { CustomerContact } from './customer-contact.entity';
import { CustomersService } from './customers.service';
import { CustomersController } from './customers.controller';
import { PipelineDeal } from '../pipeline/pipeline-deal.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Customer, CustomerContact, PipelineDeal]),
  ],
  controllers: [CustomersController],
  providers: [CustomersService],
  exports: [CustomersService],
})
export class CustomersModule {}
