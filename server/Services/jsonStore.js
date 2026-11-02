import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const dataDirectory = fileURLToPath(new URL("../data/", import.meta.url));
const storePath = resolve(process.env.JSON_STORE_PATH || `${dataDirectory}store.json`);
const legacyUsersPath = `${dataDirectory}users.json`;
const legacyPropertiesPath = `${dataDirectory}properties.json`;

let store;
let writeQueue = Promise.resolve();
let temporaryFileCounter = 0;

function emptyStore() {
    return { version: 1, users: [], properties: [], transactions: [] };
}

async function readJsonFile(path) {
    try {
        return JSON.parse(await readFile(path, "utf8"));
    } catch (error) {
        if (error.code === "ENOENT") return undefined;
        throw error;
    }
}

function validateStore(value) {
    if (
        !value ||
        !Array.isArray(value.users) ||
        !Array.isArray(value.properties) ||
        !Array.isArray(value.transactions)
    ) {
        throw new Error(`JSON data file has an invalid format: ${storePath}`);
    }
    return { ...value, version: 1 };
}

async function persistStore(value) {
    await mkdir(dirname(storePath), { recursive: true });
    const temporaryPath = `${storePath}.${process.pid}.${temporaryFileCounter++}.tmp`;
    await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, {
        encoding: "utf8",
        flag: "wx",
    });
    await rename(temporaryPath, storePath);
}

function normalizeLegacyData(usersFile, propertiesFile) {
    const result = emptyStore();
    result.users = Array.isArray(usersFile?.users) ? usersFile.users : [];

    for (const legacyProperty of propertiesFile?.properties ?? []) {
        if (!legacyProperty?.id) continue;
        const { transactions = [], owners, ...property } = legacyProperty;
        result.properties.push({
            ...property,
            createdBy: property.createdBy ?? owners?.[0]?.userId ?? null,
        });
        for (const transaction of transactions) {
            if (!transaction?.id) continue;
            result.transactions.push({
                ...transaction,
                propertyId: legacyProperty.id,
            });
        }
    }
    return result;
}

export async function initializeJsonStore() {
    if (store) return;

    const existing = await readJsonFile(storePath);
    if (existing !== undefined) {
        store = validateStore(existing);
        return;
    }

    const [legacyUsers, legacyProperties] = await Promise.all([
        readJsonFile(legacyUsersPath),
        readJsonFile(legacyPropertiesPath),
    ]);
    store = normalizeLegacyData(legacyUsers, legacyProperties);
    await persistStore(store);
}

export function readJsonStore() {
    if (!store) throw new Error("JSON data store has not been initialized");
    return structuredClone(store);
}

export function updateJsonStore(update) {
    if (!store) throw new Error("JSON data store has not been initialized");

    const operation = writeQueue.then(async () => {
        const nextStore = structuredClone(store);
        const result = update(nextStore);
        await persistStore(nextStore);
        store = nextStore;
        return structuredClone(result);
    });
    writeQueue = operation.then(() => undefined, () => undefined);
    return operation;
}

export async function mergeImportedData(importedData) {
    return updateJsonStore((current) => {
        const imported = { users: 0, properties: 0, transactions: 0 };
        const userIds = new Set(current.users.map((user) => user.id));
        const userEmails = new Set(current.users.map((user) => user.email?.toLowerCase()));
        for (const user of importedData.users) {
            const email = user.email?.toLowerCase();
            if (!user.id || !email || userIds.has(user.id) || userEmails.has(email)) continue;
            current.users.push(user);
            userIds.add(user.id);
            userEmails.add(email);
            imported.users++;
        }

        const propertyIds = new Set(current.properties.map((property) => property.id));
        for (const property of importedData.properties) {
            if (!property.id || propertyIds.has(property.id)) continue;
            current.properties.push(property);
            propertyIds.add(property.id);
            imported.properties++;
        }

        const transactionIds = new Set(current.transactions.map((transaction) => transaction.id));
        for (const transaction of importedData.transactions) {
            if (!transaction.id || transactionIds.has(transaction.id)) continue;
            current.transactions.push(transaction);
            transactionIds.add(transaction.id);
            imported.transactions++;
        }
        return imported;
    });
}
