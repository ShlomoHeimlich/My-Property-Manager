export const PROPERTY_TYPES = ["apartment", "house", "commercial", "land", "other"];
export const PROPERTY_STATUSES = ["active", "archived", "sold"];

export function toPublicProperty(property) {
    return {
        id: property.id,
        name: property.name,
        address: property.address,
        city: property.city,
        type: property.type,
        apartmentPrice: property.apartmentPrice ?? property.purchasePrice ?? null,
        additionalCosts: property.additionalCosts ?? [],
        purchaseDate: property.purchaseDate ?? "",
        sizeSqm: property.sizeSqm ?? null,
        rooms: property.rooms ?? null,
        notes: property.notes ?? "",
        status: property.status,
        createdAt: property.createdAt,
        updatedAt: property.updatedAt,
    };
}
