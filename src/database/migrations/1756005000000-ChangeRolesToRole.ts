import { MigrationInterface, QueryRunner } from 'typeorm';

export class ChangeRolesToRole1756005000000 implements MigrationInterface {
  name = 'ChangeRolesToRole1756005000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1단계: 새로운 role 컬럼 추가
    await queryRunner.query(`
      ALTER TABLE users 
      ADD COLUMN role users_role_enum
    `);

    // 2단계: 기존 roles 배열의 첫 번째 값을 role 컬럼으로 복사
    await queryRunner.query(`
      UPDATE users 
      SET role = roles[1]
      WHERE array_length(roles, 1) > 0
    `);

    // 3단계: role 컬럼을 NOT NULL로 설정
    await queryRunner.query(`
      ALTER TABLE users 
      ALTER COLUMN role SET NOT NULL
    `);

    // 4단계: 기존 roles 컬럼 삭제
    await queryRunner.query(`
      ALTER TABLE users 
      DROP COLUMN roles
    `);

    // 5단계: 기존 복합 인덱스 삭제
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_users_email_role_unique"
    `);

    // 6단계: 새로운 복합 인덱스 생성 (email + role 조합으로 유니크성 보장)
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_users_email_role_unique" ON users (email, role)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 롤백 로직: 원래 상태로 되돌리기
    
    // 1단계: roles 배열 컬럼 다시 추가
    await queryRunner.query(`
      ALTER TABLE users 
      ADD COLUMN roles users_role_enum[] DEFAULT '{}'::users_role_enum[]
    `);

    // 2단계: role 컬럼의 값을 roles 배열로 복사
    await queryRunner.query(`
      UPDATE users 
      SET roles = ARRAY[role]
    `);

    // 3단계: roles 컬럼을 NOT NULL로 설정
    await queryRunner.query(`
      ALTER TABLE users 
      ALTER COLUMN roles SET NOT NULL
    `);

    // 4단계: role 컬럼 삭제
    await queryRunner.query(`
      ALTER TABLE users 
      DROP COLUMN role
    `);

    // 5단계: 기존 복합 인덱스 삭제
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_users_email_role_unique"
    `);

    // 6단계: 원래 복합 인덱스 복원 (email + roles[1] 조합)
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_users_email_role_unique" ON users (email, (roles[1]))
    `);
  }
}
