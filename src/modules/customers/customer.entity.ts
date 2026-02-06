import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PipelineDeal } from '../pipeline/pipeline-deal.entity';
import { CustomerContact } from './customer-contact.entity';

@Entity('customers')
export class Customer {
  @PrimaryGeneratedColumn()
  id: number;

  // CLIENT ORGANIZATION
  @Column({ unique: true })
  name: string;

  @OneToMany(() => PipelineDeal, (deal) => deal.customer)
  deals: PipelineDeal[];

  @OneToMany(() => CustomerContact, (contact) => contact.customer, {
    cascade: true,
  })
  contacts?: CustomerContact[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
