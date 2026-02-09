import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { AuthIdentity } from '../auth/auth.entity';

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

  @ManyToOne(() => AuthIdentity)
  @JoinColumn({ name: 'auth_identity_id' })
  authIdentity: AuthIdentity;

  @Column({ type: 'text' })
  department: string;

  @Column({
    type: 'bigint',
    transformer: {
      to: (value: number) => value,
      from: (value: string) => Number(value),
    },
  })
  yearlyTarget: number;

  /** ✅ UNCHANGED */
  @Column({ type: 'text', default: 'ACTIVE' })
  status: 'ACTIVE' | 'INACTIVE';

  /** 🕒 AUDIT */
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
