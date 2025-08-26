import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCandidateCapAndContactFields1755862651876 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add acquiredCandidateCap field for referrer plans
        await queryRunner.query(`
            ALTER TABLE "subscription_plans" 
            ADD COLUMN "acquiredCandidateCap" INTEGER;
        `);

        // Add requiresContact field for enterprise plans
        await queryRunner.query(`
            ALTER TABLE "subscription_plans" 
            ADD COLUMN "requiresContact" BOOLEAN DEFAULT FALSE;
        `);

        // Update existing plans with candidate caps
        await queryRunner.query(`
            UPDATE "subscription_plans" 
            SET "acquiredCandidateCap" = 10, "requiresContact" = FALSE
            WHERE code = 'FREE' AND "targetRole" = 'referrer';
        `);

        await queryRunner.query(`
            UPDATE "subscription_plans" 
            SET "acquiredCandidateCap" = 25, "requiresContact" = FALSE
            WHERE code = 'PRO' AND "targetRole" = 'referrer';
        `);

        await queryRunner.query(`
            UPDATE "subscription_plans" 
            SET "acquiredCandidateCap" = 50, "requiresContact" = FALSE
            WHERE code = 'BUSINESS' AND "targetRole" = 'referrer';
        `);

        await queryRunner.query(`
            UPDATE "subscription_plans" 
            SET "acquiredCandidateCap" = NULL, "requiresContact" = TRUE
            WHERE code = 'ENTERPRISE' AND "targetRole" = 'referrer';
        `);

        // Set requiresContact to FALSE for candidate plans
        await queryRunner.query(`
            UPDATE "subscription_plans" 
            SET "requiresContact" = FALSE
            WHERE "targetRole" = 'candidate';
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove the added columns
        await queryRunner.query(`
            ALTER TABLE "subscription_plans" 
            DROP COLUMN "acquiredCandidateCap";
        `);

        await queryRunner.query(`
            ALTER TABLE "subscription_plans" 
            DROP COLUMN "requiresContact";
        `);
    }

}
