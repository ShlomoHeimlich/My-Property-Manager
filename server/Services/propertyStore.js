import { dataSource } from "../database/dataSource.js";
import Property from "../Models/Property.js";
import PropertyTransaction from "../Models/PropertyTransaction.js";

const properties = () => dataSource.getRepository(Property);
const transactions = () => dataSource.getRepository(PropertyTransaction);

export async function listProperties() {
    return properties().find({ order: { updatedAt: "DESC" } });
}

export async function findPropertyById(id) {
    return properties().findOneBy({ id });
}

export async function saveProperty(property) {
    return properties().save(property);
}

export async function updateProperty(id, updates) {
    const { removeLegacyOwners: _removeLegacyOwners, ...propertyUpdates } = updates;
    await properties().update({ id }, propertyUpdates);
    return findPropertyById(id);
}

export async function addTransaction(propertyId, transaction) {
    return transactions().save({ ...transaction, property: { id: propertyId } });
}

export async function listTransactions(propertyId, where = {}) {
    return transactions().find({
        where: { ...where, property: { id: propertyId } },
        order: { date: "DESC", createdAt: "DESC" },
    });
}

export async function removeTransaction(propertyId, transactionId) {
    const result = await transactions().delete({ id: transactionId, property: { id: propertyId } });
    return result.affected > 0;
}
