// import {
//   Entity,
//   PrimaryGeneratedColumn,
//   Column,
//   CreateDateColumn,
//   ManyToOne,
//   JoinColumn,
// } from 'typeorm';
// import { User } from '../users/users.entity';

// @Entity()
// export class Meeting {
//   @PrimaryGeneratedColumn()
//   id: number;

//   @Column()
//   repName: string;

//   @Column()
//   customerName: string;

//   @Column({ nullable: true })
//   primaryContact: string;

//   @Column({ nullable: true })
//   meetingPurpose: string;

//   @Column({ nullable: true })
//   meetingOutcome: string;

//   @Column({ type: 'text' })
//   reportingMonth: string;

//   @Column({ type: 'integer' })
//   reportingWeek: number;

//   @CreateDateColumn()
//   createdAt: Date; // Date the weekly report was uploaded

//   @ManyToOne(() => User, { nullable: true })
//   @JoinColumn({ name: 'userId' })
//   user?: User;

//   @Column({ nullable: true })
//   userId?: number;
// }

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { User } from '../users/users.entity';

@Entity('meeting')
@Unique('UQ_user_month_week', ['userId', 'reportingMonth', 'reportingWeek'])
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

  @CreateDateColumn()
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
