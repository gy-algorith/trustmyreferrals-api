import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRoleBasedPasswordResetTokens1755865986422 implements MigrationInterface {
    name = 'AddRoleBasedPasswordResetTokens1755865986422'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add new role-based password reset token columns
        await queryRunner.query(`ALTER TABLE "users" ADD "candidatePasswordResetToken" character varying`);
        await queryRunner.query(`ALTER TABLE "users" ADD "candidatePasswordResetExpires" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "users" ADD "referrerPasswordResetToken" character varying`);
        await queryRunner.query(`ALTER TABLE "users" ADD "referrerPasswordResetExpires" TIMESTAMP`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove the added columns
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "candidatePasswordResetToken"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "candidatePasswordResetExpires"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "referrerPasswordResetToken"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "referrerPasswordResetExpires"`);
    }
}
