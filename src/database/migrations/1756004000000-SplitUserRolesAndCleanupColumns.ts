import { MigrationInterface, QueryRunner } from 'typeorm';

export class SplitUserRolesAndCleanupColumns1756004000000 implements MigrationInterface {
  name = 'SplitUserRolesAndCleanupColumns1756004000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1단계: email unique 제약 조건 제거 (roles 분할로 인해 같은 이메일로 여러 사용자 가능)
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_users_email_unique"
    `);

    // 2단계: 새로운 통합 컬럼들 추가
    await queryRunner.query(`
      ALTER TABLE users 
      ADD COLUMN password VARCHAR,
      ADD COLUMN "passwordResetToken" VARCHAR,
      ADD COLUMN "passwordResetExpires" TIMESTAMP,
      ADD COLUMN "subscriptionStatus" VARCHAR DEFAULT 'free',
      ADD COLUMN "subscriptionStartDate" TIMESTAMP,
      ADD COLUMN "subscriptionEndDate" TIMESTAMP,
      ADD COLUMN "nextBillingDate" TIMESTAMP,
      ADD COLUMN "subscriptionInterval" VARCHAR,
      ADD COLUMN "candidateCap" INTEGER,
      ADD COLUMN "purchasedCandidates" INTEGER DEFAULT 0
    `);

    // 3단계: dual role 사용자들을 각 역할별로 분리하여 복사
    
    // dual role 사용자들을 찾아서 각 역할별로 별도 레코드 생성
    await queryRunner.query(`
      INSERT INTO users (
        id,
        email,
        roles,
        "firstName",
        "lastName",
        password,
        "lastLoginAt",
        "emailVerified",
        status,
        "referredBy",
        "stripeAccountId",
        "stripeOnboardingStatus",
        "stripeCustomerId",
        balance,
        "currentPlanCode",
        "passwordResetToken",
        "passwordResetExpires",
        "stripeSubscriptionId",
        "subscriptionStatus",
        "subscriptionStartDate",
        "subscriptionEndDate",
        "nextBillingDate",
        "subscriptionInterval",
        "candidateCap",
        "purchasedCandidates",
        "createdAt",
        "updatedAt"
      )
      SELECT 
        gen_random_uuid() as id,
        email,
        ARRAY['referrer'::users_role_enum] as roles,
        "firstName",
        "lastName",
        "referrerPassword" as password,
        "lastLoginAt",
        "emailVerified",
        status,
        "referredBy",
        "stripeAccountId",
        "stripeOnboardingStatus",
        "stripeCustomerId",
        balance,
        "currentPlanCode",
        "referrerPasswordResetToken" as "passwordResetToken",
        "referrerPasswordResetExpires" as "passwordResetExpires",
        "stripeSubscriptionId",
        "referrerSubscriptionStatus" as "subscriptionStatus",
        "referrerSubscriptionStartDate" as "subscriptionStartDate",
        "referrerSubscriptionEndDate" as "subscriptionEndDate",
        "referrerNextBillingDate" as "nextBillingDate",
        "referrerSubscriptionInterval" as "subscriptionInterval",
        "referrerCandidateCap" as "candidateCap",
        "referrerPurchasedCandidates" as "purchasedCandidates",
        "createdAt",
        "updatedAt"
      FROM users 
      WHERE 'referrer' = ANY(roles) AND 'candidate' = ANY(roles)
    `);

    await queryRunner.query(`
      INSERT INTO users (
        id,
        email,
        roles,
        "firstName",
        "lastName",
        password,
        "lastLoginAt",
        "emailVerified",
        status,
        "referredBy",
        "stripeAccountId",
        "stripeOnboardingStatus",
        "stripeCustomerId",
        balance,
        "currentPlanCode",
        "passwordResetToken",
        "passwordResetExpires",
        "stripeSubscriptionId",
        "subscriptionStatus",
        "subscriptionStartDate",
        "subscriptionEndDate",
        "nextBillingDate",
        "subscriptionInterval",
        "candidateCap",
        "purchasedCandidates",
        "createdAt",
        "updatedAt"
      )
      SELECT 
        gen_random_uuid() as id,
        email,
        ARRAY['candidate'::users_role_enum] as roles,
        "firstName",
        "lastName",
        "candidatePassword" as password,
        "lastLoginAt",
        "emailVerified",
        status,
        "referredBy",
        "stripeAccountId",
        "stripeOnboardingStatus",
        "stripeCustomerId",
        balance,
        "currentPlanCode",
        "candidatePasswordResetToken" as "passwordResetToken",
        "candidatePasswordResetExpires" as "passwordResetExpires",
        "stripeSubscriptionId",
        "candidateSubscriptionStatus" as "subscriptionStatus",
        "candidateSubscriptionStartDate" as "subscriptionStartDate",
        "candidateSubscriptionEndDate" as "subscriptionEndDate",
        "candidateNextBillingDate" as "nextBillingDate",
        "candidateSubscriptionInterval" as "subscriptionInterval",
        "referrerCandidateCap" as "candidateCap",
        "referrerPurchasedCandidates" as "purchasedCandidates",
        "createdAt",
        "updatedAt"
      FROM users 
      WHERE 'referrer' = ANY(roles) AND 'candidate' = ANY(roles)
    `);

    // 4단계: 기존 dual role 사용자들의 roles를 단일 역할로 변경
    // referrer 역할을 유지하고 candidate 역할 제거
    await queryRunner.query(`
      UPDATE users 
      SET roles = ARRAY['referrer'::users_role_enum]
      WHERE 'referrer' = ANY(roles) AND 'candidate' = ANY(roles)
    `);

    // 5단계: 중복 컬럼들을 통합 컬럼으로 데이터 이전
    // candidate만 있는 사용자들의 데이터를 통합 컬럼으로 이동
    await queryRunner.query(`
      UPDATE users 
      SET 
        password = "candidatePassword",
        "passwordResetToken" = "candidatePasswordResetToken",
        "passwordResetExpires" = "candidatePasswordResetExpires",
        "subscriptionStatus" = "candidateSubscriptionStatus",
        "subscriptionStartDate" = "candidateSubscriptionStartDate",
        "subscriptionEndDate" = "candidateSubscriptionEndDate",
        "nextBillingDate" = "candidateNextBillingDate",
        "subscriptionInterval" = "candidateSubscriptionInterval"
      WHERE 'candidate' = ANY(roles) AND 'referrer' != ANY(roles)
    `);

    // referrer만 있는 사용자들의 데이터를 통합 컬럼으로 이동
    await queryRunner.query(`
      UPDATE users 
      SET 
        password = "referrerPassword",
        "passwordResetToken" = "referrerPasswordResetToken",
        "passwordResetExpires" = "referrerPasswordResetExpires",
        "subscriptionStatus" = "referrerSubscriptionStatus",
        "subscriptionStartDate" = "referrerSubscriptionStartDate",
        "subscriptionEndDate" = "referrerSubscriptionEndDate",
        "nextBillingDate" = "referrerNextBillingDate",
        "subscriptionInterval" = "referrerSubscriptionInterval",
        "candidateCap" = "referrerCandidateCap",
        "purchasedCandidates" = "referrerPurchasedCandidates"
      WHERE 'referrer' = ANY(roles) AND 'candidate' != ANY(roles)
    `);

    // 6단계: 중복 컬럼들 삭제
    await queryRunner.query(`
      ALTER TABLE users 
      DROP COLUMN "candidatePassword",
      DROP COLUMN "referrerPassword",
      DROP COLUMN "candidatePasswordResetToken",
      DROP COLUMN "referrerPasswordResetToken",
      DROP COLUMN "candidatePasswordResetExpires",
      DROP COLUMN "referrerPasswordResetExpires",
      DROP COLUMN "candidateSubscriptionStatus",
      DROP COLUMN "referrerSubscriptionStatus",
      DROP COLUMN "candidateSubscriptionStartDate",
      DROP COLUMN "referrerSubscriptionStartDate",
      DROP COLUMN "candidateSubscriptionEndDate",
      DROP COLUMN "referrerSubscriptionEndDate",
      DROP COLUMN "candidateNextBillingDate",
      DROP COLUMN "referrerNextBillingDate",
      DROP COLUMN "candidateSubscriptionInterval",
      DROP COLUMN "referrerSubscriptionInterval",
      DROP COLUMN "referrerCandidateCap",
      DROP COLUMN "referrerPurchasedCandidates"
    `);

    // 7단계: 새로운 복합 인덱스 생성 (email + role 조합으로 유니크성 보장)
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_users_email_role_unique" ON users (email, (roles[1]))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 롤백 로직: 원래 상태로 되돌리기
    
    // 1단계: 통합 컬럼들 삭제
    await queryRunner.query(`
      ALTER TABLE users 
      DROP COLUMN password,
      DROP COLUMN "passwordResetToken",
      DROP COLUMN "passwordResetExpires",
      DROP COLUMN "subscriptionStatus",
      DROP COLUMN "subscriptionStartDate",
      DROP COLUMN "subscriptionEndDate",
      DROP COLUMN "nextBillingDate",
      DROP COLUMN "subscriptionInterval",
      DROP COLUMN "candidateCap",
      DROP COLUMN "purchasedCandidates"
    `);

    // 2단계: 중복 컬럼들 다시 추가
    await queryRunner.query(`
      ALTER TABLE users 
      ADD COLUMN "candidatePassword" VARCHAR,
      ADD COLUMN "referrerPassword" VARCHAR,
      ADD COLUMN "candidatePasswordResetToken" VARCHAR,
      ADD COLUMN "referrerPasswordResetToken" VARCHAR,
      ADD COLUMN "candidatePasswordResetExpires" TIMESTAMP,
      ADD COLUMN "referrerPasswordResetExpires" TIMESTAMP,
      ADD COLUMN "candidateSubscriptionStatus" VARCHAR DEFAULT 'free',
      ADD COLUMN "referrerSubscriptionStatus" VARCHAR DEFAULT 'free',
      ADD COLUMN "candidateSubscriptionStartDate" TIMESTAMP,
      ADD COLUMN "referrerSubscriptionStartDate" TIMESTAMP,
      ADD COLUMN "candidateSubscriptionEndDate" TIMESTAMP,
      ADD COLUMN "referrerSubscriptionEndDate" TIMESTAMP,
      ADD COLUMN "candidateNextBillingDate" TIMESTAMP,
      ADD COLUMN "referrerNextBillingDate" TIMESTAMP,
      ADD COLUMN "candidateSubscriptionInterval" VARCHAR,
      ADD COLUMN "referrerSubscriptionInterval" VARCHAR,
      ADD COLUMN "referrerCandidateCap" INTEGER,
      ADD COLUMN "referrerPurchasedCandidates" INTEGER DEFAULT 0
    `);

    // 3단계: 복합 인덱스 삭제하고 원래 email unique 인덱스 복원
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_users_email_role_unique"
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_users_email_unique" ON users (email)
    `);

    // 4단계: dual role 사용자들을 다시 하나로 합치기
    // (복잡한 로직이 필요하므로 여기서는 기본 구조만 복원)
    
    // 5단계: roles 배열을 다시 복원
    await queryRunner.query(`
      UPDATE users 
      SET roles = ARRAY['referrer'::users_role_enum, 'candidate'::users_role_enum]
      WHERE email IN (
        SELECT email 
        FROM users 
        GROUP BY email 
        HAVING COUNT(*) > 1
      )
    `);
  }
}
