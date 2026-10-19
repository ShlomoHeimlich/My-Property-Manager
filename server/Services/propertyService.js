import { randomUUID } from "node:crypto";
import { Between } from "typeorm";
import { PROPERTY_STATUSES, PROPERTY_TYPES, toPublicProperty } from "../Models/Property.js";
import {
    addTransaction as storeTransaction,
    findPropertyById,
    listProperties,
    listTransactions as listStoredTransactions,
    removeTransaction as deleteStoredTransaction,
    saveProperty,
    updateProperty,
} from "./propertyStore.js";

export class PropertyError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}

function normalizeText(value, fieldName, maxLength = Infinity, required = false) {
    const text = typeof value === "string" ? value.trim() : "";
    if (required && !text) throw new PropertyError(400, `יש למלא ${fieldName}`);
    if (text.length > maxLength) throw new PropertyError(400, `${fieldName} ארוך מדי`);
    return text;
}

function normalizeOptionalNumber(value, fieldName, { min = 0, max = Infinity } = {}) {
    if (value === "" || value === null || value === undefined) return null;
    const number = Number(value);
    if (!Number.isFinite(number) || number < min || number > max) {
        throw new PropertyError(400, `ערך לא תקין עבור ${fieldName}`);
    }
    return number;
}

function normalizeAdditionalCosts(inputCosts) {
    if (inputCosts === undefined) return [];
    if (!Array.isArray(inputCosts)) {
        throw new PropertyError(400, "רשימת העלויות הנוספות אינה תקינה");
    }

    return inputCosts.map((cost) => {
        const name = normalizeText(cost?.name, "שם העלות", undefined, true);
        const amount = normalizeOptionalNumber(cost?.amount, name, { min: 0.01 });
        if (amount === null) throw new PropertyError(400, `יש להזין סכום עבור ${name}`);
        return { id: typeof cost.id === "string" ? cost.id : randomUUID(), name, amount };
    });
}

function serializeProperty(property) {
    return toPublicProperty(property);
}

function canAccessProperty(property, userId) {
    return property.createdBy === userId ||
        (!property.createdBy && property.owners?.some((owner) => owner.userId === userId));
}

function assertPropertyAccess(property, userId) {
    if (!canAccessProperty(property, userId)) {
        throw new PropertyError(404, "הנכס לא נמצא");
    }
}

function normalizeDetails(input = {}) {
    const type = input.type || "apartment";
    if (!PROPERTY_TYPES.includes(type)) throw new PropertyError(400, "סוג הנכס אינו תקין");

    return {
        name: normalizeText(input.name, "שם הנכס", 100, true),
        address: normalizeText(input.address, "כתובת", 200, true),
        city: normalizeText(input.city, "עיר", 100, true),
        type,
        apartmentPrice: normalizeOptionalNumber(
            input.apartmentPrice ?? input.purchasePrice,
            "מחיר דירה",
        ),
        additionalCosts: normalizeAdditionalCosts(input.additionalCosts),
        purchaseDate: normalizeText(input.purchaseDate, "תאריך רכישה", 10) || null,
        sizeSqm: normalizeOptionalNumber(input.sizeSqm, "שטח", { min: 0.1, max: 1000000 }),
        rooms: normalizeOptionalNumber(input.rooms, "מספר חדרים", { min: 0.1, max: 1000 }),
        notes: normalizeText(input.notes, "הערות", 5000),
    };
}

export async function getPropertiesForUser(userId, includeInactive = false) {
    const properties = await listProperties();
    return Promise.all(properties
        .filter((property) => canAccessProperty(property, userId))
        .filter((property) => includeInactive || property.status === "active")
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
        .map(serializeProperty));
}

export async function getPropertyForUser(id, userId) {
    const property = await findPropertyById(id);
    if (!property) throw new PropertyError(404, "הנכס לא נמצא");
    assertPropertyAccess(property, userId);
    return serializeProperty(property);
}

export async function createProperty(input, userId) {
    const details = normalizeDetails(input);
    const now = new Date().toISOString();
    const property = {
        id: randomUUID(),
        ...details,
        createdBy: userId,
        status: "active",
        createdAt: now,
        updatedAt: now,
    };
    await saveProperty(property);
    return serializeProperty(property);
}

export async function editProperty(id, input, userId) {
    const property = await findPropertyById(id);
    if (!property) throw new PropertyError(404, "הנכס לא נמצא");
    assertPropertyAccess(property, userId);
    const details = normalizeDetails(input);
    const updated = await updateProperty(id, {
        ...details,
        createdBy: userId,
        removeLegacyOwners: true,
        updatedAt: new Date().toISOString(),
    });
    return serializeProperty(updated);
}

export async function changePropertyStatus(id, status, userId) {
    if (!PROPERTY_STATUSES.includes(status) || status === "active") {
        throw new PropertyError(400, "ניתן לארכב נכס או לסמן אותו כנמכר");
    }
    const property = await findPropertyById(id);
    if (!property) throw new PropertyError(404, "הנכס לא נמצא");
    assertPropertyAccess(property, userId);
    const updated = await updateProperty(id, {
        status,
        createdBy: userId,
        removeLegacyOwners: true,
        updatedAt: new Date().toISOString(),
    });
    return serializeProperty(updated);
}

export async function getPropertyTransactions(id, { month, year }, userId) {
    if (month && !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
        throw new PropertyError(400, "יש לבחור חודש תקין");
    }
    if (year && !/^\d{4}$/.test(year)) {
        throw new PropertyError(400, "יש לבחור שנה תקינה");
    }
    if (Boolean(month) === Boolean(year)) {
        throw new PropertyError(400, "יש לבחור חודש או שנה לסינון");
    }
    const property = await findPropertyById(id);
    if (!property) throw new PropertyError(404, "הנכס לא נמצא");
    assertPropertyAccess(property, userId);
    const dateFilter = month
        ? { date: Between(`${month}-01`, `${month}-${new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate()}`) }
        : { date: Between(`${year}-01-01`, `${year}-12-31`) };
    return listStoredTransactions(id, dateFilter);
}

export async function createTransaction(id, input = {}, userId) {
    const property = await findPropertyById(id);
    if (!property) throw new PropertyError(404, "הנכס לא נמצא");
    assertPropertyAccess(property, userId);

    const type = input.type;
    if (type !== "income" && type !== "expense") {
        throw new PropertyError(400, "סוג התנועה חייב להיות הכנסה או הוצאה");
    }
        const transactionCategories = {
            expense: new Set([
                "electricity",
                "water",
                "mortgage",
                "life_insurance",
                "property_insurance",
                "management_fee",
                "arnona",
                "vaad_bayit",
                "other",
            ]),
            income: new Set(["rent", "other"]),
        };
        const category = typeof input.category === "string" ? input.category : "";
        if (!transactionCategories[type].has(category)) {
            throw new PropertyError(400, "יש לבחור קטגוריה תקינה לסוג התנועה");
        }
        const customCategory = category === "other"
            ? normalizeText(input.customCategory, "שם הקטגוריה", undefined, true)
            : null;
    const description = normalizeText(input.description, "תיאור", undefined, true);
    const amount = normalizeOptionalNumber(input.amount, "סכום", { min: 0.01 });
    if (amount === null) throw new PropertyError(400, "יש להזין סכום חיובי");
    const date = typeof input.date === "string" ? input.date : "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00`))) {
        throw new PropertyError(400, "יש להזין תאריך תקין");
    }

    const transaction = {
        id: randomUUID(),
        type,
            category,
            customCategory,
        description,
        amount,
        date,
        createdAt: new Date().toISOString(),
    };
    await storeTransaction(id, transaction);
    return transaction;
}

export async function deleteTransaction(id, transactionId, userId) {
    const property = await findPropertyById(id);
    if (!property) throw new PropertyError(404, "הנכס לא נמצא");
    assertPropertyAccess(property, userId);
    const removed = await deleteStoredTransaction(id, transactionId);
    if (!removed) throw new PropertyError(404, "התנועה לא נמצאה");
    return true;
}