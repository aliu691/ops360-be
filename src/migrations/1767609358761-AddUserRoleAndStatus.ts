import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserRoleAndStatus1767609358761 implements MigrationInterface {
    name = 'AddUserRoleAndStatus1767609358761'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "temporary_users" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "name" varchar NOT NULL, "email" varchar, "weeklySalesTarget" integer NOT NULL DEFAULT (0), "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), CONSTRAINT "UQ_51b8b26ac168fbe7d6f5653e6cf" UNIQUE ("name"))`);
        await queryRunner.query(`INSERT INTO "temporary_users"("id", "name", "email", "weeklySalesTarget", "createdAt", "updatedAt") SELECT "id", "name", "email", "weeklySalesTarget", "createdAt", "updatedAt" FROM "users"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`ALTER TABLE "temporary_users" RENAME TO "users"`);
        await queryRunner.query(`CREATE TABLE "temporary_users" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "name" varchar NOT NULL, "email" varchar, "weeklySalesTarget" integer NOT NULL DEFAULT (0), "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), "role" text NOT NULL DEFAULT ('SALES_REP'), "status" text NOT NULL DEFAULT ('ACTIVE'), CONSTRAINT "UQ_51b8b26ac168fbe7d6f5653e6cf" UNIQUE ("name"))`);
        await queryRunner.query(`INSERT INTO "temporary_users"("id", "name", "email", "weeklySalesTarget", "createdAt", "updatedAt") SELECT "id", "name", "email", "weeklySalesTarget", "createdAt", "updatedAt" FROM "users"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`ALTER TABLE "temporary_users" RENAME TO "users"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" RENAME TO "temporary_users"`);
        await queryRunner.query(`CREATE TABLE "users" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "name" varchar NOT NULL, "email" varchar, "weeklySalesTarget" integer NOT NULL DEFAULT (0), "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), CONSTRAINT "UQ_51b8b26ac168fbe7d6f5653e6cf" UNIQUE ("name"))`);
        await queryRunner.query(`INSERT INTO "users"("id", "name", "email", "weeklySalesTarget", "createdAt", "updatedAt") SELECT "id", "name", "email", "weeklySalesTarget", "createdAt", "updatedAt" FROM "temporary_users"`);
        await queryRunner.query(`DROP TABLE "temporary_users"`);
        await queryRunner.query(`ALTER TABLE "users" RENAME TO "temporary_users"`);
        await queryRunner.query(`CREATE TABLE "users" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "name" varchar NOT NULL, "email" varchar, "weeklySalesTarget" integer NOT NULL DEFAULT (0), "isActive" boolean NOT NULL DEFAULT (1), "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), CONSTRAINT "UQ_51b8b26ac168fbe7d6f5653e6cf" UNIQUE ("name"))`);
        await queryRunner.query(`INSERT INTO "users"("id", "name", "email", "weeklySalesTarget", "createdAt", "updatedAt") SELECT "id", "name", "email", "weeklySalesTarget", "createdAt", "updatedAt" FROM "temporary_users"`);
        await queryRunner.query(`DROP TABLE "temporary_users"`);
    }

}
