import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity()
export class Finding {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  repName: string; // The rep this finding belongs to

  @Column()
  rule: string; // e.g. 'MEETINGS_BELOW_MINIMUM'

  @Column()
  message: string; // Human-friendly description

  @Column({ default: 'open' })
  status: string; // "open" | "closed"

  @Column({ default: 'medium' })
  severity: string; // "low" | "medium" | "high"

  @CreateDateColumn()
  createdAt: Date;
}
