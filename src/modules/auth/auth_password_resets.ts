import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { AuthIdentity } from './auth.entity';

@Entity('auth_password_resets')
export class AuthPasswordReset {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => AuthIdentity)
  @JoinColumn({ name: 'auth_identity_id' })
  authIdentity: AuthIdentity;

  @Column({ type: 'uuid', unique: true })
  token: string;

  @Column({ name: 'expires_at' })
  expiresAt: Date;

  @Column({ default: false })
  used: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
