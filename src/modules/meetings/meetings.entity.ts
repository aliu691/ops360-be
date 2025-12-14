import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity()
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
  reportingMonth: string;

  @Column({ type: 'integer' })
  reportingWeek: number;

  @CreateDateColumn()
  createdAt: Date; // Date the weekly report was uploaded
}
