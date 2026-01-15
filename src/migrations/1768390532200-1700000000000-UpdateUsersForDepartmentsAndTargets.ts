import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateUsersForDepartmentsAndTargets1700000000000 implements MigrationInterface {
  name = 'UpdateUsersForDepartmentsAndTargets1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    /* -----------------------------
       1️⃣ Add new columns
    ------------------------------*/
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN "firstName" text,
      ADD COLUMN "lastName" text,
      ADD COLUMN "department" text,
      ADD COLUMN "yearlyTarget" integer DEFAULT 0,
      ADD COLUMN "authRole" text DEFAULT 'USER'
    `);

    /* -----------------------------
       2️⃣ Migrate existing data
    ------------------------------*/
    await queryRunner.query(`
      UPDATE "users"
      SET
        "firstName" = "name",
        "lastName" = 'Unknown',
        "department" = "role",
        "yearlyTarget" = 0
    `);

    /* -----------------------------
       3️⃣ Make required fields NOT NULL
    ------------------------------*/
    await queryRunner.query(`
      ALTER TABLE "users"
      ALTER COLUMN "firstName" SET NOT NULL,
      ALTER COLUMN "lastName" SET NOT NULL,
      ALTER COLUMN "department" SET NOT NULL,
      ALTER COLUMN "authRole" SET NOT NULL
    `);

    /* -----------------------------
       4️⃣ Remove old columns
    ------------------------------*/
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN "name",
      DROP COLUMN "weeklySalesTarget",
      DROP COLUMN "role"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    /* -----------------------------
       1️⃣ Restore old columns
    ------------------------------*/
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN "name" text,
      ADD COLUMN "weeklySalesTarget" integer DEFAULT 0,
      ADD COLUMN "role" text DEFAULT 'SALES_REP'
    `);

    /* -----------------------------
       2️⃣ Restore data
    ------------------------------*/
    await queryRunner.query(`
      UPDATE "users"
      SET
        "name" = "firstName",
        "weeklySalesTarget" = 0,
        "role" = "department"
    `);

    /* -----------------------------
       3️⃣ Drop new columns
    ------------------------------*/
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN "firstName",
      DROP COLUMN "lastName",
      DROP COLUMN "department",
      DROP COLUMN "yearlyTarget",
      DROP COLUMN "authRole"
    `);
  }
}
