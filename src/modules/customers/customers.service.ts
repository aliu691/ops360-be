import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { Customer } from './customer.entity';
import { CustomerContact } from './customer-contact.entity';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { CreateCustomerContactDto } from './dto/create-customer-contact.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { UpdateCustomerContactDto } from './dto/update-customer-contact.dto';
import { CreateCustomerContactsDto } from './dto/create-customer-contacts.dto';
import { PipelineDeal } from '../pipeline/pipeline-deal.entity';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private customerRepo: Repository<Customer>,

    @InjectRepository(CustomerContact)
    private contactRepo: Repository<CustomerContact>,

    @InjectRepository(PipelineDeal)
    private dealRepo: Repository<PipelineDeal>,
  ) {}

  private async getCustomerDealStats(customerId: number) {
    const stats = await this.dealRepo
      .createQueryBuilder('deal')
      .select([
        `COUNT(deal.id)::int AS "dealCount"`,
        `
        COALESCE(
          SUM(COALESCE(deal.dealValueManual, deal.dealValueExcel)),
          0
        )::float AS "totalDealSize"
        `,
      ])
      .where('deal.customer_id = :customerId', { customerId })
      .andWhere('deal.status = :status', { status: 'ACTIVE' })
      .getRawOne();

    return {
      dealCount: Number(stats.dealCount),
      totalDealSize: Number(stats.totalDealSize),
    };
  }

  /* ======================
   * CUSTOMER
   * ====================== */

  async createCustomer(dto: CreateCustomerDto) {
    const name = dto.name.trim();

    const existing = await this.customerRepo.findOne({
      where: { name: ILike(name) },
    });

    if (existing) {
      throw new ConflictException('A customer with this name already exists');
    }

    const customer = this.customerRepo.create({
      name,
      contacts: dto.contacts?.length ? dto.contacts : [],
    });

    const saved = await this.customerRepo.save(customer);

    return this.customerRepo.findOne({
      where: { id: saved.id },
      relations: ['contacts'],
    });
  }

  async updateCustomer(id: number, dto: UpdateCustomerDto) {
    await this.customerRepo.update(id, dto);

    return this.customerRepo.findOne({
      where: { id },
      relations: ['contacts'],
    });
  }

  async findOrCreateCustomerByName(customerName: string): Promise<Customer> {
    let customer = await this.customerRepo.findOne({
      where: { name: customerName },
    });

    if (!customer) {
      customer = this.customerRepo.create({ name: customerName });
      customer = await this.customerRepo.save(customer);

      console.log(`🏢 Created customer "${customerName}" (id=${customer.id})`);
    } else {
      console.log(
        `🔁 Existing customer "${customerName}" reused (id=${customer.id})`,
      );
    }

    return customer;
  }

  async getCustomerById(id: number) {
    const customer = await this.customerRepo.findOne({
      where: { id },
      relations: ['contacts'],
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    const stats = await this.getCustomerDealStats(customer.id);

    return {
      success: true,
      item: {
        ...customer,
        dealCount: stats.dealCount,
        totalDealSize: stats.totalDealSize,
      },
    };
  }

  async getAllCustomers(page = 1, limit = 20) {
    const take = Math.min(limit, 100); // safety cap
    const skip = (page - 1) * take;

    const [customers, total] = await this.customerRepo.findAndCount({
      relations: ['contacts'],
      order: { name: 'ASC' },
      take,
      skip,
    });

    return {
      success: true,
      page,
      limit: take,
      total,
      totalPages: Math.ceil(total / take),
      customers,
    };
  }

  async getCustomerDeals(
    customerId: number,
    page = 1,
    limit = 20,
    stageId?: number,
  ) {
    const take = Math.min(limit, 100);
    const skip = (page - 1) * take;

    const qb = this.dealRepo
      .createQueryBuilder('deal')
      .select('deal')
      .leftJoinAndSelect('deal.salesOwner', 'salesOwner')
      .leftJoinAndSelect('deal.preSalesOwners', 'preSalesOwners')
      .leftJoinAndSelect('deal.stageExcel', 'stageExcel')
      .leftJoinAndSelect('deal.stageManual', 'stageManual')
      .where('deal.customer_id = :customerId', { customerId })
      .andWhere('deal.status = :status', { status: 'ACTIVE' });

    if (stageId) {
      qb.andWhere(
        `
        (
          stageManual.id = :stageId
          OR (stageManual.id IS NULL AND stageExcel.id = :stageId)
        )
        `,
        { stageId },
      );
    }

    qb.orderBy('deal.updatedAt', 'DESC').take(take).skip(skip);

    const [deals, total] = await qb.getManyAndCount();

    return {
      success: true,
      page,
      limit: take,
      total,
      totalPages: Math.ceil(total / take),
      items: deals.map((deal) => ({
        ...deal,
        displayValue: Number(deal.dealValueManual ?? deal.dealValueExcel ?? 0),
        displayStage: deal.stageManual ?? deal.stageExcel,
      })),
    };
  }

  /* ======================
   * CUSTOMER CONTACT
   * ====================== */

  async createCustomerContact(
    customerId: number,
    dto: CreateCustomerContactDto,
  ) {
    const customer = await this.customerRepo.findOne({
      where: { id: customerId },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    // Prevent empty contact
    if (!dto.name && !dto.email && !dto.mobile) {
      throw new BadRequestException('Contact cannot be empty');
    }

    const contact = this.contactRepo.create({
      ...dto,
      customer,
    });

    return this.contactRepo.save(contact);
  }

  async updateCustomerContact(id: number, dto: UpdateCustomerContactDto) {
    await this.contactRepo.update(id, dto);
    return this.contactRepo.findOne({ where: { id } });
  }

  async addCustomerContact(params: {
    customer: Customer;
    name?: string;
    email?: string;
    mobile?: string;
  }) {
    const { customer, name, email, mobile } = params;

    if (!name && !email && !mobile) return;

    const where: any = {
      customer: { id: customer.id },
    };

    if (email) where.email = email;
    if (mobile) where.mobile = mobile;

    const existingContact = await this.contactRepo.findOne({ where });

    if (existingContact) {
      console.log(
        `👤 Skipped duplicate contact for "${customer.name}" (email=${email ?? 'n/a'})`,
      );
      return;
    }

    const contact = this.contactRepo.create({
      customer,
      name,
      email,
      mobile,
    });

    await this.contactRepo.save(contact);

    console.log(
      `👤 Added contact "${name ?? 'Unnamed'}" to "${customer.name}"`,
    );
  }
}
