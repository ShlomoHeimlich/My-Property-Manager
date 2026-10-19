import "dotenv/config";
import { DataSource } from "typeorm";
import User from "../Models/User.js";
import Property from "../Models/Property.js";
import PropertyTransaction from "../Models/PropertyTransaction.js";
import { InitialSchema1710000000000 } from "./migrations/1710000000000-InitialSchema.js";
import { TransactionCategories1720000000000 } from "./migrations/1720000000000-TransactionCategories.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
    throw new Error("DATABASE_URL חסר. יש להגדיר ב-server/.env רק את מחרוזת postgresql://… של Neon.");
}

function normalizeDatabaseUrl(value) {
    let normalized = value.trim().replace(/^psql\s+/i, "").trim();
    normalized = normalized.replace(/^['"]|['"]$/g, "");

    const parts = normalized.match(/^(postgres(?:ql)?:\/\/[^/?#]+\/[^/?#]+)\?(.+)$/i);
    if (parts) {
        const databasePath = parts[1].slice(parts[1].lastIndexOf("/"));
        const duplicateAt = parts[2].indexOf(`${databasePath}?`);
        if (duplicateAt >= 0) {
            normalized = `${parts[1]}?${parts[2].slice(0, duplicateAt).replace(/[&/]$/, "")}`;
        }
    }

    try {
        const parsed = new URL(normalized);
        if (parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:") {
            throw new Error("unsupported protocol");
        }
        return { value: normalized, parsed };
    } catch {
        throw new Error("DATABASE_URL לא תקין. יש להדביק ב-server/.env רק את הכתובת postgresql://… בלי התחילית psql ובלי טקסט נוסף.");
    }
}

const normalizedDatabaseUrl = normalizeDatabaseUrl(databaseUrl);
const databaseUrlObject = normalizedDatabaseUrl.parsed;
const useSsl = databaseUrlObject.searchParams.get("sslmode") === "require" ||
    databaseUrlObject.searchParams.get("ssl") === "true";

export const dataSource = new DataSource({
    type: "postgres",
    url: normalizedDatabaseUrl.value,
    ssl: useSsl ? { rejectUnauthorized: false } : false,
    entities: [User, Property, PropertyTransaction],
    migrations: [InitialSchema1710000000000, TransactionCategories1720000000000],
    migrationsRun: true,
    synchronize: false,
    logging: process.env.NODE_ENV === "development",
});
