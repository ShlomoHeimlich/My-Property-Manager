export class InitialSchema1710000000000 {
    name = "InitialSchema1710000000000";

    async up(queryRunner) {
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS users (
                id uuid PRIMARY KEY,
                name varchar(80) NOT NULL,
                email varchar(254) NOT NULL UNIQUE,
                password_hash varchar(100) NOT NULL,
                created_at timestamptz NOT NULL DEFAULT now()
            )
        `);
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS properties (
                id uuid PRIMARY KEY,
                name varchar(100) NOT NULL,
                address varchar(200) NOT NULL,
                city varchar(100) NOT NULL,
                type varchar(30) NOT NULL DEFAULT 'apartment',
                apartment_price numeric(18, 2),
                additional_costs jsonb NOT NULL DEFAULT '[]'::jsonb,
                purchase_date date,
                notes text NOT NULL DEFAULT '',
                status varchar(20) NOT NULL DEFAULT 'active',
                created_by uuid REFERENCES users(id) ON DELETE CASCADE,
                created_at timestamptz NOT NULL DEFAULT now(),
                updated_at timestamptz NOT NULL DEFAULT now()
            )
        `);
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS property_transactions (
                id uuid PRIMARY KEY,
                property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
                type varchar(10) NOT NULL CHECK (type IN ('income', 'expense')),
                description text NOT NULL,
                amount numeric(18, 2) NOT NULL CHECK (amount > 0),
                date date NOT NULL,
                created_at timestamptz NOT NULL DEFAULT now()
            )
        `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_properties_created_by ON properties(created_by)`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_property_transactions_property_date ON property_transactions(property_id, date)`);
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS legacy_imports (
                name varchar(100) PRIMARY KEY,
                imported_at timestamptz NOT NULL DEFAULT now()
            )
        `);
    }

    async down(queryRunner) {
        await queryRunner.query("DROP TABLE IF EXISTS property_transactions");
        await queryRunner.query("DROP TABLE IF EXISTS properties");
        await queryRunner.query("DROP TABLE IF EXISTS users");
        await queryRunner.query("DROP TABLE IF EXISTS legacy_imports");
    }
}
