export class TransactionCategories1720000000000 {
    name = "TransactionCategories1720000000000";

    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE property_transactions ADD COLUMN IF NOT EXISTS category varchar(40) NOT NULL DEFAULT 'other'`);
        await queryRunner.query(`ALTER TABLE property_transactions ADD COLUMN IF NOT EXISTS custom_category text`);
    }

    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE property_transactions DROP COLUMN IF EXISTS custom_category`);
        await queryRunner.query(`ALTER TABLE property_transactions DROP COLUMN IF EXISTS category`);
    }
}
