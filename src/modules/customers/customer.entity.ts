import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CustomerContact } from './customer-contact.entity';

@Entity('customers')
export class Customer {
  @PrimaryGeneratedColumn()
  id: number;

  // CLIENT ORGANIZATION
  @Column({ unique: true })
  name: string;

  @OneToMany(() => CustomerContact, (contact) => contact.customer, {
    cascade: true,
  })
  contacts?: CustomerContact[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
