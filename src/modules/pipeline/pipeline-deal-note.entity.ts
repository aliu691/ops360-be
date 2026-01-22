// src/modules/pipeline/pipeline-deal-note.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { PipelineDeal } from './pipeline-deal.entity';
import { User } from '../users/users.entity';

@Entity('pipeline_deal_notes')
@Index(['dealId'])
export class PipelineDealNote {
  @PrimaryGeneratedColumn()
  id: number;

  /* -----------------------------
       Deal
    ------------------------------*/
  @ManyToOne(() => PipelineDeal, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'deal_id' })
  deal: PipelineDeal;

  @Column({ name: 'deal_id' })
  dealId: number;

  /* -----------------------------
       Author
    ------------------------------*/
  @ManyToOne(() => User)
  @JoinColumn({ name: 'author_id' })
  author: User;

  @Column({ name: 'author_id' })
  authorId: number;

  /* -----------------------------
       Note
    ------------------------------*/
  @Column({ type: 'text' })
  note: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
