import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1781572228329 implements MigrationInterface {
    name = 'InitialSchema1781572228329'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying NOT NULL, "password_hash" character varying NOT NULL, "fcm_token" character varying, CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "alerts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "symbol" character varying NOT NULL, "target_price" numeric(12,4) NOT NULL, "triggered" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_60f895662df096bfcdfab7f4b96" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_f1eba840c1761991f142affee6" ON "alerts"  ("user_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_135d5ba855d8f173865b11b609" ON "alerts"  ("symbol", "triggered", "target_price") `);
        await queryRunner.query(`ALTER TABLE "alerts" ADD CONSTRAINT "FK_f1eba840c1761991f142affee66" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "alerts" DROP CONSTRAINT "FK_f1eba840c1761991f142affee66"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_135d5ba855d8f173865b11b609"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f1eba840c1761991f142affee6"`);
        await queryRunner.query(`DROP TABLE "alerts"`);
        await queryRunner.query(`DROP TABLE "users"`);
    }

}
