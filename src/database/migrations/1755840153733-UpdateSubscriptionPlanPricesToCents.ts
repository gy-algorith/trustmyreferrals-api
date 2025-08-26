import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateSubscriptionPlanPricesToCents1755840153733 implements MigrationInterface {
  name = 'UpdateSubscriptionPlanPricesToCents1755840153733';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 기존 price 필드들을 cents 단위로 변환
    await queryRunner.query(`
      ALTER TABLE subscription_plans 
      ALTER COLUMN "monthlyPrice" TYPE INTEGER,
      ALTER COLUMN "yearlyPrice" TYPE INTEGER
    `);

    // cents 단위로 데이터 업데이트 (예: $29 -> 2900)
    await queryRunner.query(`
      UPDATE subscription_plans 
      SET "monthlyPrice" = "monthlyPrice" * 100 
      WHERE "monthlyPrice" > 0
    `);

    await queryRunner.query(`
      UPDATE subscription_plans 
      SET "yearlyPrice" = "yearlyPrice" * 100 
      WHERE "yearlyPrice" > 0
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 롤백: cents를 다시 dollars로 변환
    await queryRunner.query(`
      UPDATE subscription_plans 
      SET "monthlyPrice" = "monthlyPrice" / 100 
      WHERE "monthlyPrice" > 0
    `);

    await queryRunner.query(`
      UPDATE subscription_plans 
      SET "yearlyPrice" = "yearlyPrice" / 100 
      WHERE "yearlyPrice" > 0
    `);

    await queryRunner.query(`
      ALTER TABLE subscription_plans 
      ALTER COLUMN "monthlyPrice" TYPE NUMERIC(10,2),
      ALTER COLUMN "yearlyPrice" TYPE NUMERIC(10,2)
    `);
  }
}
