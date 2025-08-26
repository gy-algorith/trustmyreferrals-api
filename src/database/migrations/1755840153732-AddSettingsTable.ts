import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSettingsTable1755840153732 implements MigrationInterface {
    name = 'AddSettingsTable1755840153732'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create settings table
        await queryRunner.query(`CREATE TABLE "settings" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "key" character varying NOT NULL, "value" text NOT NULL, "description" text, "type" character varying NOT NULL DEFAULT 'string', "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_c8639b7626fa94ba8265628f214" UNIQUE ("key"), CONSTRAINT "PK_0669fe20e252eb692bf4d344975" PRIMARY KEY ("id"))`);
        
        // Insert default settings
        await queryRunner.query(`INSERT INTO "settings" ("key", "value", "description", "type") VALUES ('withdrawal_processing_fee_percentage', '3', 'Processing fee percentage for withdrawals (3%)', 'number')`);
        await queryRunner.query(`INSERT INTO "settings" ("key", "value", "description", "type") VALUES ('withdrawal_minimum_amount', '1000', 'Minimum withdrawal amount in cents ($10.00)', 'number')`);
        await queryRunner.query(`INSERT INTO "settings" ("key", "value", "description", "type") VALUES ('withdrawal_maximum_amount', '1000000', 'Maximum withdrawal amount in cents ($10,000.00)', 'number')`);
        await queryRunner.query(`INSERT INTO "settings" ("key", "value", "description", "type") VALUES ('platform_currency', 'usd', 'Platform default currency', 'string')`);
        await queryRunner.query(`INSERT INTO "settings" ("key", "value", "description", "type") VALUES ('stripe_connect_enabled', 'true', 'Whether Stripe Connect is enabled', 'boolean')`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop settings table
        await queryRunner.query(`DROP TABLE "settings"`);
    }

}
