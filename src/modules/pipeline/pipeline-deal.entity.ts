import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { User } from '../users/users.entity';
import { DealStage } from '../deal-stages/deal-stage.entity';
import { Customer } from '../customers/customer.entity';

@Entity('pipeline_deals')
@Index(['year', 'quarter'])
@Index(['salesOwnerId'])
export class PipelineDeal {
  /* -----------------------------
         Primary Key
      ------------------------------*/
  @PrimaryGeneratedColumn()
  id: number;

  /* -----------------------------
         External Identity (Excel)
         Create-only reference
      ------------------------------*/
  @Column({
    name: 'external_deal_id',
    type: 'varchar',
    length: 32,
    unique: true,
    nullable: true,
  })
  externalDealId: string | null;

  /* -----------------------------
         Core Deal Info
      ------------------------------*/
  @Column({ name: 'organization_name' })
  organizationName: string;

  @Column({ name: 'deal_name' })
  dealName: string;

  /* -----------------------------
         Ownership
      ------------------------------*/
  @ManyToOne(() => User)
  @JoinColumn({ name: 'sales_owner_id' })
  salesOwner: User;

  @Column({ name: 'sales_owner_id' })
  salesOwnerId: number;

  @ManyToMany(() => User)
  @JoinTable({
    name: 'pipeline_deal_pre_sales',
    joinColumn: {
      name: 'deal_id',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'pre_sales_owner_id',
      referencedColumnName: 'id',
    },
  })
  preSalesOwners: User[];

  /* -----------------------------
         Deal Value (₦)
         Excel seeds, UI may override
      ------------------------------*/
  @Column({
    name: 'deal_value_excel',
    type: 'numeric',
    default: 0,
  })
  dealValueExcel: number;

  @Column({
    name: 'deal_value_manual',
    type: 'bigint',
    nullable: true,
  })
  dealValueManual?: number;

  /* -----------------------------
         Deal Stage
         Excel seeds, UI may override
      ------------------------------*/
  @ManyToOne(() => DealStage)
  @JoinColumn({ name: 'stage_excel_id' })
  stageExcel: DealStage;

  @Column({ name: 'stage_excel_id' })
  stageExcelId: number;

  @ManyToOne(() => DealStage, { nullable: true })
  @JoinColumn({ name: 'stage_manual_id' })
  stageManual?: DealStage;

  @Column({ name: 'stage_manual_id', nullable: true })
  stageManualId?: number;

  /* -----------------------------
         Time Bucketing
      ------------------------------*/
  @Column({ name: 'year', type: 'int' })
  year: number;

  @Column({ name: 'quarter', type: 'int' })
  quarter: 1 | 2 | 3 | 4;

  /* -----------------------------
         Dates & Signals
      ------------------------------*/
  @Column({
    name: 'expected_close_date',
    type: 'date',
    nullable: true,
  })
  expectedCloseDate?: Date;

  @Column({
    name: 'next_action',
    type: 'text',
    nullable: true,
  })
  nextAction?: string;

  /**
   * 🔴 Blocker / risk description
   * NULL = no blocker
   */
  @Column({
    name: 'red_flag',
    type: 'text',
    nullable: true,
  })
  redFlag?: string;

  /* -----------------------------
         Metadata
      ------------------------------*/
  @Column({
    name: 'source',
    type: 'text',
    default: 'EXCEL',
  })
  source: 'EXCEL' | 'UI';

  @Column({
    name: 'status',
    type: 'text',
    default: 'ACTIVE',
  })
  status: 'ACTIVE' | 'INACTIVE';

  /* -----------------------------
         System Dates
      ------------------------------*/
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  /* -----------------------------
         System Dates
      ------------------------------*/

  @ManyToOne(() => Customer, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'customer_id' })
  customer?: Customer;

  /* =====================================================
         🔹 DERIVED (NOT STORED)
      ===================================================== */

  /**
   * Final deal value used everywhere
   * UI override > Excel seed
   */
  get effectiveDealValue(): number {
    return this.dealValueManual ?? this.dealValueExcel;
  }

  /**
   * Final stage used everywhere
   * UI override > Excel seed
   */
  get effectiveStage(): DealStage {
    return this.stageManual ?? this.stageExcel;
  }

  /**
   * Weighted pipeline value
   */
  get weightedPipelineValue(): number {
    if (!this.effectiveStage) return 0;
    return Math.round(
      (this.effectiveDealValue * this.effectiveStage.probability) / 100,
    );
  }
}
