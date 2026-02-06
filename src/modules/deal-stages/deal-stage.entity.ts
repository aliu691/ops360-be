import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('deal_stages')
export class DealStage {
  @PrimaryGeneratedColumn()
  id: number;

  // e.g. QUALIFIED_OPPORTUNITY, CLOSE_WON
  @Column({ unique: true })
  key: string;

  // Human-readable
  @Column()
  name: string;

  // 0 - 100
  @Column({ type: 'int' })
  probability: number;

  // Order in pipeline
  @Column({ type: 'int', name: 'sort_order' }) // ✅ FIX
  sortOrder: number;

  @CreateDateColumn({ name: 'created_at' }) // ✅ FIX
  createdAt: Date;
}
