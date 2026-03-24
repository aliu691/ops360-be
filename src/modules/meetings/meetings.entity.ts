import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  ManyToMany,
  JoinTable,
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

  @ManyToMany(() => User)
  @JoinTable({
    name: 'meeting_pre_sales',
    joinColumn: {
      name: 'meeting_id',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'pre_sales_owner_id',
      referencedColumnName: 'id',
    },
  })
  preSalesOwners: User[];

  @Column({ type: 'text' })
  reportingMonth: string; // YYYY-MM

  @Column({ type: 'int' })
  reportingWeek: number;

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
