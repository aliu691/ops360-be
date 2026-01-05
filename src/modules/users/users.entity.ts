// src/modules/users/users.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @Column({ nullable: true })
  email?: string;

  @Column({ type: 'int', default: 0 })
  weeklySalesTarget: number;

  @Column({ type: 'text', default: 'SALES_REP' })
  role: 'ADMIN' | 'SALES_REP' | 'MANAGER';

  @Column({ type: 'text', default: 'ACTIVE' })
  status: 'ACTIVE' | 'INACTIVE';

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
