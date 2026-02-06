import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProdSchemaExpansion1770376460906 implements MigrationInterface {
  name = 'ProdSchemaExpansion1770376460906';

  public async up(queryRunner: QueryRunner): Promise<void> {
    /* ============================
       ENUMS
    ============================ */
    await queryRunner.query(`
  DO $$ BEGIN
    CREATE TYPE "public"."admins_role_enum"
    AS ENUM ('SUPER_ADMIN', 'ADMIN');
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END $$;
`);

    await queryRunner.query(`
  DO $$ BEGIN
    CREATE TYPE "public"."admins_status_enum"
    AS ENUM ('ACTIVE', 'INACTIVE');
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END $$;
`);

    /* ============================
       AUTH
    ============================ */
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "auth_identities" (
        "id" SERIAL PRIMARY KEY,
        "email" VARCHAR NOT NULL UNIQUE,
        "password_hash" TEXT,
        "status" VARCHAR NOT NULL DEFAULT 'ACTIVE',
        "created_at" TIMESTAMP DEFAULT now(),
        "updated_at" TIMESTAMP DEFAULT now()
      )
    `);

    /* ============================
       ADMINS
    ============================ */
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "admins" (
        "id" SERIAL PRIMARY KEY,
        "email" VARCHAR NOT NULL UNIQUE,
        "role" "public"."admins_role_enum" NOT NULL DEFAULT 'ADMIN',
        "status" "public"."admins_status_enum" NOT NULL DEFAULT 'ACTIVE',
        "createdAt" TIMESTAMP DEFAULT now(),
        "auth_identity_id" INTEGER UNIQUE,
        CONSTRAINT "FK_admin_auth_identity"
          FOREIGN KEY ("auth_identity_id")
          REFERENCES "auth_identities"("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "admin_invites" (
        "id" SERIAL PRIMARY KEY,
        "email" VARCHAR NOT NULL UNIQUE,
        "token" VARCHAR NOT NULL,
        "expiresAt" TIMESTAMP NOT NULL,
        "used" BOOLEAN DEFAULT false,
        "createdAt" TIMESTAMP DEFAULT now()
      )
    `);

    /* ============================
       DEPARTMENTS
    ============================ */
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "departments" (
        "id" SERIAL PRIMARY KEY,
        "key" VARCHAR NOT NULL UNIQUE,
        "name" VARCHAR NOT NULL,
        "createdAt" TIMESTAMP DEFAULT now()
      )
    `);

    /* ============================
       CUSTOMERS
    ============================ */
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "customers" (
        "id" SERIAL PRIMARY KEY,
        "name" VARCHAR NOT NULL UNIQUE,
        "createdAt" TIMESTAMP DEFAULT now(),
        "updatedAt" TIMESTAMP DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "customer_contacts" (
        "id" SERIAL PRIMARY KEY,
        "customer_id" INTEGER NOT NULL,
        "name" VARCHAR,
        "email" VARCHAR,
        "mobile" VARCHAR,
        "created_at" TIMESTAMP DEFAULT now(),
        "updated_at" TIMESTAMP DEFAULT now(),
        CONSTRAINT "FK_customer_contact_customer"
          FOREIGN KEY ("customer_id")
          REFERENCES "customers"("id")
          ON DELETE CASCADE
      )
    `);

    /* ============================
       DEAL STAGES
    ============================ */
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "deal_stages" (
        "id" SERIAL PRIMARY KEY,
        "key" VARCHAR NOT NULL UNIQUE,
        "name" VARCHAR NOT NULL,
        "probability" INTEGER NOT NULL,
        "sort_order" INTEGER NOT NULL,
        "created_at" TIMESTAMP DEFAULT now()
      )
    `);

    /* ============================
       PIPELINE
    ============================ */
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "pipeline_deals" (
        "id" SERIAL PRIMARY KEY,
        "external_deal_id" VARCHAR UNIQUE,
        "organization_name" VARCHAR NOT NULL,
        "deal_name" VARCHAR NOT NULL,
        "sales_owner_id" INTEGER NOT NULL,
        "deal_value_excel" NUMERIC DEFAULT 0,
        "deal_value_manual" NUMERIC(15,2),
        "stage_excel_id" INTEGER NOT NULL,
        "stage_manual_id" INTEGER,
        "year" INTEGER NOT NULL,
        "quarter" INTEGER NOT NULL,
        "expected_close_date" DATE,
        "next_action" TEXT,
        "red_flag" TEXT,
        "source" TEXT DEFAULT 'EXCEL',
        "status" TEXT DEFAULT 'ACTIVE',
        "created_at" TIMESTAMP DEFAULT now(),
        "updated_at" TIMESTAMP DEFAULT now(),
        "customer_id" INTEGER
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "pipeline_deal_notes" (
        "id" SERIAL PRIMARY KEY,
        "deal_id" INTEGER NOT NULL,
        "author_id" INTEGER NOT NULL,
        "note" TEXT NOT NULL,
        "created_at" TIMESTAMP DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "pipeline_deal_pre_sales" (
        "deal_id" INTEGER NOT NULL,
        "pre_sales_owner_id" INTEGER NOT NULL,
        PRIMARY KEY ("deal_id", "pre_sales_owner_id")
      )
    `);

    /* ============================
       AUDIT LOGS
    ============================ */
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "audit_logs" (
        "id" SERIAL PRIMARY KEY,
        "actor_type" VARCHAR NOT NULL,
        "actor_id" INTEGER NOT NULL,
        "action" VARCHAR NOT NULL,
        "entity" VARCHAR,
        "entity_id" INTEGER,
        "metadata" JSONB,
        "ip_address" VARCHAR,
        "user_agent" TEXT,
        "created_at" TIMESTAMP DEFAULT now()
      )
    `);
  }

  public async down(): Promise<void> {
    /* 
      Intentionally empty.
      This migration bootstraps production schema.
      Rollbacks are not supported.
    */
  }
}
