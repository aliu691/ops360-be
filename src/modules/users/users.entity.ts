// import {
//   Entity,
//   PrimaryGeneratedColumn,
//   Column,
// } from 'typeorm';

// @Entity('users')
// export class User {
//   @PrimaryGeneratedColumn()
//   id: number;

//   @Column()
//   firstName: string;

//   @Column()
//   lastName: string;

//   @Column()
//   email: string;

//   @Column({ type: 'text' })
//   department: string;

//   @Column({ type: 'int', default: 0 })
//   yearlyTarget: number;

//   @Column({ type: 'text', default: 'USER' })
//   authRole: 'USER';

//   @Column({ type: 'text', default: 'ACTIVE' })
//   status: 'ACTIVE' | 'INACTIVE';
// }

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

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ unique: true })
  email: string;

  /** 🔐 AUTH (NEW) */
  @Column({ type: 'text', nullable: true })
  passwordHash: string | null;

  @Column({ type: 'text' })
  department: string;

  @Column({ type: 'int', default: 0 })
  yearlyTarget: number;

  /** ✅ UNCHANGED */
  @Column({ type: 'text', default: 'ACTIVE' })
  status: 'ACTIVE' | 'INACTIVE';

  /** 🕒 AUDIT */
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
