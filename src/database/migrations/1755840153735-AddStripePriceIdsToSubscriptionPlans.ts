import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStripePriceIdsToSubscriptionPlans1755840153735 implements MigrationInterface {
  name = 'AddStripePriceIdsToSubscriptionPlans1755840153735';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // subscription_plans 테이블에 Stripe Price ID 필드들 추가
    await queryRunner.query(`
      ALTER TABLE subscription_plans 
      ADD COLUMN "stripeMonthlyPriceId" character varying(100),
      ADD COLUMN "stripeYearlyPriceId" character varying(100)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Stripe Price ID 필드들 삭제
    await queryRunner.query(`
      ALTER TABLE subscription_plans 
      DROP COLUMN "stripeMonthlyPriceId",
      DROP COLUMN "stripeYearlyPriceId"
    `);
  }
}
