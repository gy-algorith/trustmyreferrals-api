import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateUserSubscriptionFields1755866800000 implements MigrationInterface {
    name = 'UpdateUserSubscriptionFields1755866800000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 사용하지 않는 구독 관련 필드들 제거
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "referrerSubscriptionPlanId"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "candidateSubscriptionPlanId"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "referrerSubscriptionStatus"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "candidateSubscriptionStatus"`);

        // 새로운 구독 상태 필드들 추가
        await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "stripeSubscriptionId" VARCHAR`);
        await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "subscriptionStatus" VARCHAR DEFAULT 'free'`);
        await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "subscriptionStartDate" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "subscriptionEndDate" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "nextBillingDate" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "subscriptionInterval" VARCHAR`);

        // 기존 사용자들의 subscriptionStatus를 'active'로 설정 (currentPlanCode가 FREE가 아닌 경우)
        await queryRunner.query(`
            UPDATE "users" 
            SET "subscriptionStatus" = 'active' 
            WHERE "currentPlanCode" IS NOT NULL 
            AND "currentPlanCode" != 'FREE'
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // 새로운 필드들 제거
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "stripeSubscriptionId"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "subscriptionStatus"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "subscriptionStartDate"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "subscriptionEndDate"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "nextBillingDate"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "subscriptionInterval"`);

        // 기존 필드들 복원 (기본값으로)
        await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "referrerSubscriptionPlanId" VARCHAR`);
        await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "candidateSubscriptionPlanId" VARCHAR`);
        await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "referrerSubscriptionStatus" VARCHAR DEFAULT 'free'`);
        await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "candidateSubscriptionStatus" VARCHAR DEFAULT 'free'`);
    }
}
