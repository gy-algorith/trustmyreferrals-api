import { MigrationInterface, QueryRunner } from "typeorm";

export class AddReferrerCandidateCapFields1755870000000 implements MigrationInterface {
    name = 'AddReferrerCandidateCapFields1755870000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // referrerCandidateCap 필드 추가
        await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "referrerCandidateCap" INTEGER`);
        
        // referrerPurchasedCandidates 필드 추가 (기본값 0)
        await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "referrerPurchasedCandidates" INTEGER DEFAULT 0`);
        
        // 기존 사용자들의 referrerCandidateCap을 subscription_plans의 acquiredCandidateCap으로 설정
        await queryRunner.query(`
            UPDATE "users" 
            SET "referrerCandidateCap" = (
                SELECT sp."acquiredCandidateCap" 
                FROM "subscription_plans" sp 
                WHERE sp."code" = "users"."currentPlanCode" 
                AND sp."targetRole" = 'referrer'
            )
            WHERE "users"."currentPlanCode" IS NOT NULL 
            AND "users"."currentPlanCode" != 'FREE'
            AND EXISTS (SELECT 1 FROM unnest("users"."roles") AS role WHERE role = 'referrer')
        `);
        
        // 기존 사용자들의 referrerPurchasedCandidates를 계산하여 설정
        // source가 'invite'가 아닌 deck 항목 수를 계산
        await queryRunner.query(`
            UPDATE "users" 
            SET "referrerPurchasedCandidates" = (
                SELECT COUNT(*) 
                FROM "deck" d 
                WHERE d."referrer_id" = "users"."id" 
                AND d."source" != 'invite'
            )
            WHERE EXISTS (SELECT 1 FROM unnest("users"."roles") AS role WHERE role = 'referrer')
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // referrerPurchasedCandidates 필드 제거
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "referrerPurchasedCandidates"`);
        
        // referrerCandidateCap 필드 제거
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "referrerCandidateCap"`);
    }
}
