import { readFile, unlink } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dataSource } from "../database/dataSource.js";
import User from "../Models/User.js";
import Property from "../Models/Property.js";
import PropertyTransaction from "../Models/PropertyTransaction.js";

const importName = "legacy-json-v1";
const usersFile = new URL("../data/users.json", import.meta.url);
const propertiesFile = new URL("../data/properties.json", import.meta.url);

async function readLegacyFile(fileUrl, collectionName) {
    try {
        const contents = await readFile(fileURLToPath(fileUrl), "utf8");
        const parsed = JSON.parse(contents);
        return Array.isArray(parsed[collectionName]) ? parsed[collectionName] : [];
    } catch (error) {
        if (error.code === "ENOENT") return [];
        throw error;
    }
}

export async function importLegacyJsonData() {
    const priorImport = await dataSource.query(
        "SELECT name FROM legacy_imports WHERE name = $1",
        [importName],
    );
    if (priorImport.length) return { imported: false };

    const [legacyUsers, legacyProperties] = await Promise.all([
        readLegacyFile(usersFile, "users"),
        readLegacyFile(propertiesFile, "properties"),
    ]);

    await dataSource.transaction(async (manager) => {
        const users = manager.getRepository(User);
        const properties = manager.getRepository(Property);
        const transactions = manager.getRepository(PropertyTransaction);

        for (const legacyUser of legacyUsers) {
            if (!legacyUser.id || !legacyUser.email || !legacyUser.passwordHash) continue;
            const existing = await users.findOneBy({ id: legacyUser.id });
            if (!existing) {
                await users.save({
                    id: legacyUser.id,
                    name: legacyUser.name || "משתמש",
                    email: legacyUser.email.trim().toLowerCase(),
                    passwordHash: legacyUser.passwordHash,
                });
            }
        }

        for (const legacyProperty of legacyProperties) {
            if (!legacyProperty.id) continue;
            let createdBy = legacyProperty.createdBy ?? legacyProperty.owners?.[0]?.userId ?? null;
            if (createdBy && !(await users.findOneBy({ id: createdBy }))) createdBy = null;

            let property = await properties.findOneBy({ id: legacyProperty.id });
            if (!property) {
                property = await properties.save({
                    id: legacyProperty.id,
                    name: legacyProperty.name || "נכס",
                    address: legacyProperty.address || "",
                    city: legacyProperty.city || "",
                    type: legacyProperty.type || "apartment",
                    apartmentPrice: legacyProperty.apartmentPrice ?? legacyProperty.purchasePrice ?? null,
                    additionalCosts: legacyProperty.additionalCosts ?? [],
                    purchaseDate: legacyProperty.purchaseDate || null,
                    notes: legacyProperty.notes || "",
                    status: legacyProperty.status || "active",
                    createdBy,
                    createdAt: legacyProperty.createdAt || new Date(),
                    updatedAt: legacyProperty.updatedAt || new Date(),
                });
            }

            for (const transaction of legacyProperty.transactions ?? []) {
                if (!transaction.id || !transaction.date) continue;
                if (await transactions.findOneBy({ id: transaction.id })) continue;
                await transactions.save({
                    id: transaction.id,
                    property: { id: property.id },
                    type: transaction.type,
                    description: transaction.description || "",
                    amount: transaction.amount,
                    date: transaction.date,
                    createdAt: transaction.createdAt || new Date(),
                });
            }
        }

        await manager.query(
            "INSERT INTO legacy_imports(name) VALUES ($1) ON CONFLICT (name) DO NOTHING",
            [importName],
        );
    });

    await Promise.all([usersFile, propertiesFile].map(async (fileUrl) => {
        try {
            await unlink(fileURLToPath(fileUrl));
        } catch (error) {
            if (error.code !== "ENOENT") throw error;
        }
    }));

    return { imported: true, users: legacyUsers.length, properties: legacyProperties.length };
}
