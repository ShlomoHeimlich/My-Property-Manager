import { readJsonStore, updateJsonStore } from "./jsonStore.js";

export async function listProperties(userId, includeInactive = false) {
    return readJsonStore().properties
        .filter((property) => property.createdBy === userId || !property.createdBy)
        .filter((property) => includeInactive || property.status === "active")
        .sort((left, right) => String(right.updatedAt).localeCompare(String(left.updatedAt)));
}

export async function findPropertyById(id) {
    return readJsonStore().properties.find((property) => property.id === id) ?? null;
}

export async function saveProperty(property) {
    return updateJsonStore((store) => {
        store.properties.push(property);
        return property;
    });
}

export async function updateProperty(id, updates) {
    const { removeLegacyOwners: _removeLegacyOwners, ...propertyUpdates } = updates;
    return updateJsonStore((store) => {
        const property = store.properties.find((savedProperty) => savedProperty.id === id);
        if (!property) return null;
        Object.assign(property, propertyUpdates);
        if (updates.removeLegacyOwners) delete property.owners;
        return property;
    });
}

export async function deleteProperty(id) {
    return updateJsonStore((store) => {
        const index = store.properties.findIndex((property) => property.id === id);
        if (index < 0) return null;
        const [deletedProperty] = store.properties.splice(index, 1);
        store.transactions = store.transactions.filter(
            (transaction) => transaction.propertyId !== id,
        );
        return deletedProperty;
    });
}

export async function addTransaction(propertyId, transaction) {
    return updateJsonStore((store) => {
        const savedTransaction = { ...transaction, propertyId };
        store.transactions.push(savedTransaction);
        return savedTransaction;
    });
}

export async function listTransactions(propertyId, where = {}) {
    return readJsonStore().transactions
        .filter((transaction) => transaction.propertyId === propertyId)
        .filter((transaction) => !where.startDate || transaction.date >= where.startDate)
        .filter((transaction) => !where.endDate || transaction.date <= where.endDate)
        .sort((left, right) =>
            String(right.date).localeCompare(String(left.date)) ||
            String(right.createdAt).localeCompare(String(left.createdAt)),
        );
}

export async function removeTransaction(propertyId, transactionId) {
    return updateJsonStore((store) => {
        const index = store.transactions.findIndex(
            (transaction) => transaction.id === transactionId && transaction.propertyId === propertyId,
        );
        if (index < 0) return false;
        store.transactions.splice(index, 1);
        return true;
    });
}
