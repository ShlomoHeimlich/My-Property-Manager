import { dataSource } from "../database/dataSource.js";
import { initializeJsonStore, mergeImportedData } from "../Services/jsonStore.js";
import User from "../Models/User.js";
import Property from "../Models/Property.js";

try {
    await initializeJsonStore();
    await dataSource.initialize();
    const [users, properties, transactions] = await Promise.all([
        dataSource.getRepository(User).find(),
        dataSource.getRepository(Property).find(),
        dataSource.query(`
            SELECT
                id,
                property_id AS "propertyId",
                type,
                category,
                custom_category AS "customCategory",
                description,
                amount,
                date,
                created_at AS "createdAt"
            FROM property_transactions
        `),
    ]);

    const imported = await mergeImportedData({
        users,
        properties,
        transactions: transactions.map((transaction) => ({
            ...transaction,
            amount: Number(transaction.amount),
            date: transaction.date instanceof Date
                ? transaction.date.toISOString().slice(0, 10)
                : String(transaction.date).slice(0, 10),
        })),
    });
    console.log(
        `Merged PostgreSQL data into the JSON store: ${imported.users} users, ` +
        `${imported.properties} properties, ${imported.transactions} transactions.`,
    );
} finally {
    if (dataSource.isInitialized) await dataSource.destroy();
}
