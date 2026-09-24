import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema20260923000000 implements MigrationInterface {
  name = 'InitialSchema20260923000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');
    await queryRunner.query(`CREATE TYPE "competency_grade" AS ENUM ('A', 'B', 'C', 'D')`);
    await queryRunner.query(`CREATE TYPE "employee_gender" AS ENUM ('MALE', 'FEMALE')`);
    await queryRunner.query(
      `CREATE TYPE "employee_position" AS ENUM ('JUNIOR_PROGRAMMER', 'MID_PROGRAMMER', 'SENIOR_PROGRAMMER')`,
    );
    await queryRunner.query(`CREATE TYPE "employment_status" AS ENUM ('ACTIVE', 'INACTIVE')`);

    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "email" varchar(254) NOT NULL,
        "password_hash" varchar(255) NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_users" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_users_email_lower" ON "users" (LOWER("email"))`,
    );

    await queryRunner.query(`
      CREATE TABLE "competencies" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" varchar(100) NOT NULL,
        "grade" "competency_grade" NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_competencies" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_competencies_name_lower" ON "competencies" (LOWER("name"))`,
    );

    await queryRunner.query(`
      CREATE TABLE "employees" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" varchar(150) NOT NULL,
        "gender" "employee_gender" NOT NULL,
        "date_of_birth" date NOT NULL,
        "email" varchar(254) NOT NULL,
        "position" "employee_position" NOT NULL,
        "status" "employment_status" NOT NULL DEFAULT 'ACTIVE',
        "hired_at" date NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz,
        CONSTRAINT "pk_employees" PRIMARY KEY ("id"),
        CONSTRAINT "ck_employees_dates" CHECK ("date_of_birth" < "hired_at")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_employees_email_lower" ON "employees" (LOWER("email"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_employees_status_position" ON "employees" ("status", "position") WHERE "deleted_at" IS NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_employees_hired_at" ON "employees" ("hired_at") WHERE "deleted_at" IS NULL`,
    );

    await queryRunner.query(`
      CREATE TABLE "employee_competencies" (
        "employee_id" uuid NOT NULL,
        "competency_id" uuid NOT NULL,
        "certificate_stored_name" varchar(255),
        "certificate_original_name" varchar(255),
        "certificate_mime_type" varchar(100),
        "certificate_size" integer,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_employee_competencies" PRIMARY KEY ("employee_id", "competency_id"),
        CONSTRAINT "ck_certificate_size" CHECK ("certificate_size" IS NULL OR "certificate_size" > 0),
        CONSTRAINT "fk_employee_competencies_employee" FOREIGN KEY ("employee_id")
          REFERENCES "employees"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_employee_competencies_competency" FOREIGN KEY ("competency_id")
          REFERENCES "competencies"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_employee_competencies_competency" ON "employee_competencies" ("competency_id")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "employee_competencies"');
    await queryRunner.query('DROP TABLE "employees"');
    await queryRunner.query('DROP TABLE "competencies"');
    await queryRunner.query('DROP TABLE "users"');
    await queryRunner.query('DROP TYPE "employment_status"');
    await queryRunner.query('DROP TYPE "employee_position"');
    await queryRunner.query('DROP TYPE "employee_gender"');
    await queryRunner.query('DROP TYPE "competency_grade"');
  }
}
