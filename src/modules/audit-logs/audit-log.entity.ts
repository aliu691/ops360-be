import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'actor_type' })
  actorType: 'USER' | 'ADMIN';

  @Column({ name: 'actor_id' })
  actorId: number;

  @Column()
  action: string;

  @Column({ nullable: true })
  entity?: string;

  @Column({ name: 'entity_id', nullable: true })
  entityId?: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @Column({ name: 'ip_address', nullable: true })
  ipAddress?: string;

  @Column({ name: 'user_agent', nullable: true })
  userAgent?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
