import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Preserves every existing grade by copying it to each employee assignment.
 * The old master-grade column remains as a legacy compatibility field so this
 * migration can be deployed without breaking an older application instance.
 */
export class MoveGradeToEmployeeCompetencies20260924000000 implements MigrationInterface {
  name = 'MoveGradeToEmployeeCompetencies20260924000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "employee_competencies" ADD COLUMN "grade" "competency_grade"',
    );
    await queryRunner.query(`
      UPDATE "employee_competencies" AS assignment
      SET "grade" = competency."grade"
      FROM "competencies" AS competency
      WHERE competency."id" = assignment."competency_id"
    `);
    await queryRunner.query(
      'ALTER TABLE "employee_competencies" ALTER COLUMN "grade" SET NOT NULL',
    );
    await queryRunner.query(
      'ALTER TABLE "employee_competencies" ALTER COLUMN "grade" SET DEFAULT \'D\'',
    );
    await queryRunner.query(
      'ALTER TABLE "competencies" ALTER COLUMN "grade" SET DEFAULT \'D\'',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "employee_competencies" ALTER COLUMN "grade" DROP DEFAULT',
    );
    await queryRunner.query(
      'ALTER TABLE "competencies" ALTER COLUMN "grade" DROP DEFAULT',
    );
    await queryRunner.query('ALTER TABLE "employee_competencies" DROP COLUMN "grade"');
  }
}
