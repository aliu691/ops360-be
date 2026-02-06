import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../users/users.entity';

@Entity('meeting')
export class Meeting {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  repName: string;

  @Column()
  customerName: string;

  @Column({ nullable: true })
  primaryContact: string;

  @Column({ nullable: true })
  meetingPurpose: string;

  @Column({ nullable: true })
  meetingOutcome: string;

  @Column({ type: 'text' })
  reportingMonth: string; // YYYY-MM

  @Column({ type: 'int' })
  reportingWeek: number; // ISO week number

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  /* -----------------------------
     RELATION
  ----------------------------- */

  @ManyToOne(() => User, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: number;
}
