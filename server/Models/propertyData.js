export const PROPERTY_TYPES = ["apartment", "house", "commercial", "land", "other"];
export const PROPERTY_STATUSES = ["active", "archived", "sold"];

function legacyTotalInvestment(property) {
    const apartmentPrice = property.apartmentPrice ?? property.purchasePrice;
    const additionalTotal = (property.additionalCosts ?? []).reduce(
        (total, cost) => total + (Number(cost.amount) || 0),
        0,
    );
    if (apartmentPrice === null || apartmentPrice === undefined) {
        return additionalTotal || null;
    }
    return Number(apartmentPrice) + additionalTotal;
}

export function toPublicProperty(property) {
    return {
        id: property.id,
        name: property.name,
        location: property.location || [property.address, property.city].filter(Boolean).join(", "),
        type: property.type,
        totalInvestment: property.totalInvestment ?? legacyTotalInvestment(property),
        purchaseDate: property.purchaseDate ?? "",
        sizeSqm: property.sizeSqm ?? null,
        rooms: property.rooms ?? null,
        notes: property.notes ?? "",
        status: property.status,
        createdAt: property.createdAt,
        updatedAt: property.updatedAt,
    };
}
