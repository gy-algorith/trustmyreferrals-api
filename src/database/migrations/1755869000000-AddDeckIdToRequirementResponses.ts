import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDeckIdToRequirementResponses1755869000000 implements MigrationInterface {
    name = 'AddDeckIdToRequirementResponses1755869000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // requirement_responses 테이블에 deck_id 컬럼 추가
        await queryRunner.query(`ALTER TABLE "requirement_responses" ADD COLUMN IF NOT EXISTS "deck_id" UUID`);
        
        // deck_id에 대한 외래키 제약 조건 추가
        await queryRunner.query(`
            ALTER TABLE "requirement_responses" 
            ADD CONSTRAINT "fk_requirement_responses_deck_id" 
            FOREIGN KEY ("deck_id") REFERENCES "deck"("id") 
            ON DELETE SET NULL
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // 외래키 제약 조건 제거
        await queryRunner.query(`ALTER TABLE "requirement_responses" DROP CONSTRAINT IF EXISTS "fk_requirement_responses_deck_id"`);
        
        // deck_id 컬럼 제거
        await queryRunner.query(`ALTER TABLE "requirement_responses" DROP COLUMN IF EXISTS "deck_id"`);
    }
}
