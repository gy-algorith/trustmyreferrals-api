import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateUserSubscriptionFieldsToRoleBased1755867000000 implements MigrationInterface {
    name = 'UpdateUserSubscriptionFieldsToRoleBased1755867000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 기존 통합 필드들을 제거
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "subscriptionStatus"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "subscriptionStartDate"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "subscriptionEndDate"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "nextBillingDate"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "subscriptionInterval"`);

        // Referrer 구독 관련 필드들 추가
        await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "referrerSubscriptionStatus" VARCHAR DEFAULT 'free'`);
        await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "referrerSubscriptionStartDate" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "referrerSubscriptionEndDate" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "referrerNextBillingDate" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "referrerSubscriptionInterval" VARCHAR`);

        // Candidate 구독 관련 필드들 추가
        await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "candidateSubscriptionStatus" VARCHAR DEFAULT 'free'`);
        await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "candidateSubscriptionStartDate" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "candidateSubscriptionEndDate" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "candidateNextBillingDate" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "candidateSubscriptionInterval" VARCHAR`);

        // 기존 사용자들의 구독 상태를 역할에 맞게 설정
        // currentPlanCode가 FREE가 아닌 경우 해당 역할의 구독 상태를 'active'로 설정
        await queryRunner.query(`
            UPDATE "users" 
            SET "referrerSubscriptionStatus" = CASE 
                WHEN "currentPlanCode" IS NOT NULL AND "currentPlanCode" != 'FREE' 
                AND EXISTS (SELECT 1 FROM unnest("roles") AS role WHERE role = 'referrer')
                THEN 'active' 
                ELSE 'free' 
            END
        `);

        await queryRunner.query(`
            UPDATE "users" 
            SET "candidateSubscriptionStatus" = CASE 
                WHEN "currentPlanCode" IS NOT NULL AND "currentPlanCode" != 'FREE' 
                AND EXISTS (SELECT 1 FROM unnest("roles") AS role WHERE role = 'candidate')
                THEN 'active' 
                ELSE 'free' 
            END
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // 역할별 필드들 제거
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "referrerSubscriptionStatus"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "referrerSubscriptionStartDate"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "referrerSubscriptionEndDate"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "referrerNextBillingDate"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "referrerSubscriptionInterval"`);

        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "candidateSubscriptionStatus"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "candidateSubscriptionStartDate"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "candidateSubscriptionEndDate"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "candidateNextBillingDate"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "candidateSubscriptionInterval"`);

        // 통합 필드들 복원
        await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "subscriptionStatus" VARCHAR DEFAULT 'free'`);
        await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "subscriptionStartDate" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "subscriptionEndDate" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "nextBillingDate" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "subscriptionInterval" VARCHAR`);
    }
}
