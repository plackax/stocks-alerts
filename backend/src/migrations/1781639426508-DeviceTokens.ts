import { MigrationInterface, QueryRunner } from "typeorm";

export class DeviceTokens1781639426508 implements MigrationInterface {
    name = 'DeviceTokens1781639426508'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "device_tokens" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "token" character varying NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_8e8b9d6f8c7d5e3a1b2c4d6e8f0" UNIQUE ("token"), CONSTRAINT "PK_9d2a8e7c6b5f4a3d2e1c0b9a8d7" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_7a6b5c4d3e2f1a0b9c8d7e6f5a" ON "device_tokens" ("user_id") `);
        await queryRunner.query(`INSERT INTO "device_tokens" ("user_id", "token") SELECT "id", "fcm_token" FROM "users" WHERE "fcm_token" IS NOT NULL ON CONFLICT ("token") DO NOTHING`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "fcm_token"`);
        await queryRunner.query(`ALTER TABLE "device_tokens" ADD CONSTRAINT "FK_6f5e4d3c2b1a0908f7e6d5c4b3a" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "fcm_token" character varying`);
        await queryRunner.query(`UPDATE "users" SET "fcm_token" = sub."token" FROM (SELECT DISTINCT ON ("user_id") "user_id", "token" FROM "device_tokens" ORDER BY "user_id", "created_at" DESC) AS sub WHERE "users"."id" = sub."user_id"`);
        await queryRunner.query(`ALTER TABLE "device_tokens" DROP CONSTRAINT "FK_6f5e4d3c2b1a0908f7e6d5c4b3a"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_7a6b5c4d3e2f1a0b9c8d7e6f5a"`);
        await queryRunner.query(`DROP TABLE "device_tokens"`);
    }

}
