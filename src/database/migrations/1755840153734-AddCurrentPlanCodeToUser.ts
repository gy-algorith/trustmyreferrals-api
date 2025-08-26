import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCurrentPlanCodeToUser1755840153734 implements MigrationInterface {
  name = 'AddCurrentPlanCodeToUser1755840153734';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // User 테이블에 currentPlanCode 컬럼 추가
    await queryRunner.query(`
      ALTER TABLE users 
      ADD COLUMN "currentPlanCode" character varying(20)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // currentPlanCode 컬럼 삭제
    await queryRunner.query(`
      ALTER TABLE users 
      DROP COLUMN "currentPlanCode"
    `);
  }
}
