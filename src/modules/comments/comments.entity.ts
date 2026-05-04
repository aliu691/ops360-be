import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../users/users.entity';
import { PipelineDeal } from '../pipeline/pipeline-deal.entity';

@Entity('comments')
@Index(['pipelineDealId'])
export class Comment {
  @PrimaryGeneratedColumn()
  id: number;

  /* -----------------------------
     RELATION → PIPELINE DEAL
  ------------------------------*/
  @ManyToOne(() => PipelineDeal, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pipeline_deal_id' })
  pipelineDeal: PipelineDeal;

  @Column({ name: 'pipeline_deal_id' })
  pipelineDealId: number;

  /* -----------------------------
     AUTHOR
  ------------------------------*/
  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: number;

  /* -----------------------------
     CONTENT
  ------------------------------*/
  @Column({ type: 'text' })
  content: string;

  /* -----------------------------
     EDIT STATE
  ------------------------------*/
  @Column({ name: 'is_edited', default: false })
  isEdited: boolean;

  /* -----------------------------
     TIMESTAMPS
  ------------------------------*/
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
