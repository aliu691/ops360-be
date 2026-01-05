import { MigrationInterface, QueryRunner } from "typeorm";

export class InitPostgresSchema1767625311087 implements MigrationInterface {
    name = 'InitPostgresSchema1767625311087'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "users" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "email" character varying, "weeklySalesTarget" integer NOT NULL DEFAULT '0', "role" text NOT NULL DEFAULT 'SALES_REP', "status" text NOT NULL DEFAULT 'ACTIVE', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_51b8b26ac168fbe7d6f5653e6cf" UNIQUE ("name"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "meeting" ("id" SERIAL NOT NULL, "repName" character varying NOT NULL, "customerName" character varying NOT NULL, "primaryContact" character varying, "meetingPurpose" character varying, "meetingOutcome" character varying, "reportingMonth" text NOT NULL, "reportingWeek" integer NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" integer, CONSTRAINT "PK_dccaf9e4c0e39067d82ccc7bb83" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "meeting" ADD CONSTRAINT "FK_854982a74818bb6307419e0e6b8" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "meeting" DROP CONSTRAINT "FK_854982a74818bb6307419e0e6b8"`);
        await queryRunner.query(`DROP TABLE "meeting"`);
        await queryRunner.query(`DROP TABLE "users"`);
    }

}
