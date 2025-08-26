import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateEntitiesToCamelCase1756003000000 implements MigrationInterface {
  name = 'UpdateEntitiesToCamelCase1756003000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // activity_logs 테이블 컬럼명 변경
    await queryRunner.query(`
      ALTER TABLE "activity_logs" 
      RENAME COLUMN "user_id" TO "userId"
    `);

    // admins 테이블 컬럼명 변경
    await queryRunner.query(`
      ALTER TABLE "admins" 
      RENAME COLUMN "created_at" TO "createdAt"
    `);
    await queryRunner.query(`
      ALTER TABLE "admins" 
      RENAME COLUMN "updated_at" TO "updatedAt"
    `);
    await queryRunner.query(`
      ALTER TABLE "admins" 
      RENAME COLUMN "first_name" TO "firstName"
    `);
    await queryRunner.query(`
      ALTER TABLE "admins" 
      RENAME COLUMN "last_name" TO "lastName"
    `);
    await queryRunner.query(`
      ALTER TABLE "admins" 
      RENAME COLUMN "phone_number" TO "phoneNumber"
    `);
    await queryRunner.query(`
      ALTER TABLE "admins" 
      RENAME COLUMN "refresh_token" TO "refreshToken"
    `);
    await queryRunner.query(`
      ALTER TABLE "admins" 
      RENAME COLUMN "permission_level" TO "permissionLevel"
    `);
    await queryRunner.query(`
      ALTER TABLE "admins" 
      RENAME COLUMN "can_manage_users" TO "canManageUsers"
    `);
    await queryRunner.query(`
      ALTER TABLE "admins" 
      RENAME COLUMN "can_manage_payments" TO "canManagePayments"
    `);
    await queryRunner.query(`
      ALTER TABLE "admins" 
      RENAME COLUMN "can_manage_content" TO "canManageContent"
    `);
    await queryRunner.query(`
      ALTER TABLE "admins" 
      RENAME COLUMN "can_manage_settings" TO "canManageSettings"
    `);

    // deck 테이블 컬럼명 변경
    await queryRunner.query(`
      ALTER TABLE "deck" 
      RENAME COLUMN "referrer_id" TO "referrerId"
    `);
    await queryRunner.query(`
      ALTER TABLE "deck" 
      RENAME COLUMN "candidate_id" TO "candidateId"
    `);

    // requirements 테이블 컬럼명 변경
    await queryRunner.query(`
      ALTER TABLE "requirements" 
      RENAME COLUMN "desired_skills" TO "desiredSkills"
    `);
    await queryRunner.query(`
      ALTER TABLE "requirements" 
      RENAME COLUMN "work_style" TO "workStyle"
    `);
    await queryRunner.query(`
      ALTER TABLE "requirements" 
      RENAME COLUMN "salary_ceiling" TO "salaryCeiling"
    `);
    await queryRunner.query(`
      ALTER TABLE "requirements" 
      RENAME COLUMN "referrer_id" TO "referrerId"
    `);
    await queryRunner.query(`
      ALTER TABLE "requirements" 
      RENAME COLUMN "closing_date" TO "closingDate"
    `);

    // requirement_responses 테이블 컬럼명 변경
    await queryRunner.query(`
      ALTER TABLE "requirement_responses" 
      RENAME COLUMN "requirement_id" TO "requirementId"
    `);
    await queryRunner.query(`
      ALTER TABLE "requirement_responses" 
      RENAME COLUMN "candidate_id" TO "candidateId"
    `);
    await queryRunner.query(`
      ALTER TABLE "requirement_responses" 
      RENAME COLUMN "referrer_id" TO "referrerId"
    `);
    await queryRunner.query(`
      ALTER TABLE "requirement_responses" 
      RENAME COLUMN "candidate_overview" TO "candidateOverview"
    `);
    await queryRunner.query(`
      ALTER TABLE "requirement_responses" 
      RENAME COLUMN "why_this_candidate" TO "whyThisCandidate"
    `);
    await queryRunner.query(`
      ALTER TABLE "requirement_responses" 
      RENAME COLUMN "purchase_price" TO "purchasePrice"
    `);
    await queryRunner.query(`
      ALTER TABLE "requirement_responses" 
      RENAME COLUMN "deck_id" TO "deckId"
    `);

    // resume 테이블 컬럼명 변경
    await queryRunner.query(`
      ALTER TABLE "resume" 
      RENAME COLUMN "section_type" TO "sectionType"
    `);
    await queryRunner.query(`
      ALTER TABLE "resume" 
      RENAME COLUMN "section_order" TO "sectionOrder"
    `);
    await queryRunner.query(`
      ALTER TABLE "resume" 
      RENAME COLUMN "section_data" TO "sectionData"
    `);
    await queryRunner.query(`
      ALTER TABLE "resume" 
      RENAME COLUMN "is_active" TO "isActive"
    `);
    await queryRunner.query(`
      ALTER TABLE "resume" 
      RENAME COLUMN "user_id" TO "userId"
    `);

    // 인덱스 이름도 업데이트
    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_deck_unique"
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "idx_deck_unique" ON "deck" ("referrerId", "candidateId")
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_candidate_interest_candidate"
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_candidate_interest_candidate" ON "candidate_interest" ("candidateId")
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_candidate_interest_referrer"
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_candidate_interest_referrer" ON "candidate_interest" ("referrerId")
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_candidate_interest_status"
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_candidate_interest_status" ON "candidate_interest" ("status")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 롤백 로직 (snake_case로 되돌리기)
    // activity_logs 테이블 컬럼명 변경
    await queryRunner.query(`
      ALTER TABLE "activity_logs" 
      RENAME COLUMN "userId" TO "user_id"
    `);

    // admins 테이블 컬럼명 변경
    await queryRunner.query(`
      ALTER TABLE "admins" 
      RENAME COLUMN "createdAt" TO "created_at"
    `);
    await queryRunner.query(`
      ALTER TABLE "admins" 
      RENAME COLUMN "updatedAt" TO "updated_at"
    `);
    await queryRunner.query(`
      ALTER TABLE "admins" 
      RENAME COLUMN "firstName" TO "first_name"
    `);
    await queryRunner.query(`
      ALTER TABLE "admins" 
      RENAME COLUMN "lastName" TO "last_name"
    `);
    await queryRunner.query(`
      ALTER TABLE "admins" 
      RENAME COLUMN "phoneNumber" TO "phone_number"
    `);
    await queryRunner.query(`
      ALTER TABLE "admins" 
      RENAME COLUMN "refreshToken" TO "refresh_token"
    `);
    await queryRunner.query(`
      ALTER TABLE "admins" 
      RENAME COLUMN "permissionLevel" TO "permission_level"
    `);
    await queryRunner.query(`
      ALTER TABLE "admins" 
      RENAME COLUMN "canManageUsers" TO "can_manage_users"
    `);
    await queryRunner.query(`
      ALTER TABLE "admins" 
      RENAME COLUMN "canManagePayments" TO "can_manage_payments"
    `);
    await queryRunner.query(`
      ALTER TABLE "admins" 
      RENAME COLUMN "canManageContent" TO "can_manage_content"
    `);
    await queryRunner.query(`
      ALTER TABLE "admins" 
      RENAME COLUMN "canManageSettings" TO "can_manage_settings"
    `);

    // deck 테이블 컬럼명 변경
    await queryRunner.query(`
      ALTER TABLE "deck" 
      RENAME COLUMN "referrerId" TO "referrer_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "deck" 
      RENAME COLUMN "candidateId" TO "candidate_id"
    `);

    // requirements 테이블 컬럼명 변경
    await queryRunner.query(`
      ALTER TABLE "requirements" 
      RENAME COLUMN "desiredSkills" TO "desired_skills"
    `);
    await queryRunner.query(`
      ALTER TABLE "requirements" 
      RENAME COLUMN "workStyle" TO "work_style"
    `);
    await queryRunner.query(`
      ALTER TABLE "requirements" 
      RENAME COLUMN "salaryCeiling" TO "salary_ceiling"
    `);
    await queryRunner.query(`
      ALTER TABLE "requirements" 
      RENAME COLUMN "referrerId" TO "referrer_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "requirements" 
      RENAME COLUMN "closingDate" TO "closing_date"
    `);

    // requirement_responses 테이블 컬럼명 변경
    await queryRunner.query(`
      ALTER TABLE "requirement_responses" 
      RENAME COLUMN "requirementId" TO "requirement_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "requirement_responses" 
      RENAME COLUMN "candidateId" TO "candidate_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "requirement_responses" 
      RENAME COLUMN "referrerId" TO "referrer_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "requirement_responses" 
      RENAME COLUMN "candidateOverview" TO "candidate_overview"
    `);
    await queryRunner.query(`
      ALTER TABLE "requirement_responses" 
      RENAME COLUMN "whyThisCandidate" TO "why_this_candidate"
    `);
    await queryRunner.query(`
      ALTER TABLE "requirement_responses" 
      RENAME COLUMN "purchasePrice" TO "purchase_price"
    `);
    await queryRunner.query(`
      ALTER TABLE "requirement_responses" 
      RENAME COLUMN "deckId" TO "deck_id"
    `);

    // resume 테이블 컬럼명 변경
    await queryRunner.query(`
      ALTER TABLE "resume" 
      RENAME COLUMN "sectionType" TO "section_type"
    `);
    await queryRunner.query(`
      ALTER TABLE "resume" 
      RENAME COLUMN "sectionOrder" TO "section_order"
    `);
    await queryRunner.query(`
      ALTER TABLE "resume" 
      RENAME COLUMN "sectionData" TO "section_data"
    `);
    await queryRunner.query(`
      ALTER TABLE "resume" 
      RENAME COLUMN "isActive" TO "is_active"
    `);
    await queryRunner.query(`
      ALTER TABLE "resume" 
      RENAME COLUMN "userId" TO "user_id"
    `);

    // 인덱스 이름도 원래대로 되돌리기
    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_deck_unique"
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "idx_deck_unique" ON "deck" ("referrer_id", "candidate_id")
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_candidate_interest_candidate"
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_candidate_interest_candidate" ON "candidate_interest" ("candidate_id")
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_candidate_interest_referrer"
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_candidate_interest_referrer" ON "candidate_interest" ("referrer_id")
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_candidate_interest_status"
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_candidate_interest_status" ON "candidate_interest" ("status")
    `);
  }
}
