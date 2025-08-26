import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdatePurchasePriceToInteger1755868000000 implements MigrationInterface {
    name = 'UpdatePurchasePriceToInteger1755868000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // purchase_price 컬럼을 decimal에서 integer로 변경
        // 기존 데이터가 있다면 cents 단위로 변환 (예: $29.99 -> 2999)
        await queryRunner.query(`
            ALTER TABLE "requirement_responses" 
            ALTER COLUMN "purchase_price" TYPE INTEGER USING 
            CASE 
                WHEN "purchase_price" IS NOT NULL 
                THEN ROUND("purchase_price" * 100)::INTEGER 
                ELSE NULL 
            END
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // integer에서 decimal로 되돌리기
        await queryRunner.query(`
            ALTER TABLE "requirement_responses" 
            ALTER COLUMN "purchase_price" TYPE DECIMAL(10,2) USING 
            CASE 
                WHEN "purchase_price" IS NOT NULL 
                THEN "purchase_price"::DECIMAL(10,2) / 100 
                ELSE NULL 
            END
        `);
    }
}
