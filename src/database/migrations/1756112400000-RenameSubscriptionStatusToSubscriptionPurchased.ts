import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameSubscriptionStatusToSubscriptionPurchased1756112400000 implements MigrationInterface {
  name = 'RenameSubscriptionStatusToSubscriptionPurchased1756112400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // subscriptionStatus 컬럼을 subscriptionPurchased로 이름 변경
    await queryRunner.query(`ALTER TABLE "users" RENAME COLUMN "subscriptionStatus" TO "subscriptionPurchased"`);
    
    // 기본값을 false로 변경 (구독을 구매하지 않음)
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "subscriptionPurchased" SET DEFAULT false`);
    
    // 기존 데이터 변환: 'active' -> true, 'free' -> false
    await queryRunner.query(`
      UPDATE "users" 
      SET "subscriptionPurchased" = CASE 
        WHEN "subscriptionPurchased" = 'active' THEN true
        ELSE false
      END
    `);
    
    // 컬럼 타입을 boolean으로 변경
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "subscriptionPurchased" TYPE boolean USING "subscriptionPurchased"::boolean`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // subscriptionPurchased 컬럼을 subscriptionStatus로 이름 변경
    await queryRunner.query(`ALTER TABLE "users" RENAME COLUMN "subscriptionPurchased" TO "subscriptionStatus"`);
    
    // 기본값을 'free'로 변경
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "subscriptionStatus" SET DEFAULT 'free'`);
    
    // 기존 데이터 변환: true -> 'active', false -> 'free'
    await queryRunner.query(`
      UPDATE "users" 
      SET "subscriptionStatus" = CASE 
        WHEN "subscriptionPurchased" = true THEN 'active'
        ELSE 'free'
      END
    `);
    
    // 컬럼 타입을 varchar로 변경
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "subscriptionStatus" TYPE varchar`);
  }
}
