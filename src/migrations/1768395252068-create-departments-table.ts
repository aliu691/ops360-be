import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDepartmentsTable1768395252068 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
          CREATE TABLE "departments" (
            "id" SERIAL PRIMARY KEY,
            "key" TEXT UNIQUE NOT NULL,
            "name" TEXT NOT NULL,
            "createdAt" TIMESTAMP DEFAULT now()
          )
        `);

    await queryRunner.query(`
          INSERT INTO "departments" ("key", "name")
          VALUES
            ('ADMIN', 'Admin'),
            ('SALES', 'Sales'),
            ('PRE_SALES', 'Pre-Sales')
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "departments"`);
  }
}
