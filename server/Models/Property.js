import { EntitySchema } from "typeorm";
import { PROPERTY_STATUSES, PROPERTY_TYPES, toPublicProperty } from "./propertyData.js";

export { PROPERTY_STATUSES, PROPERTY_TYPES, toPublicProperty };

const numericTransformer = {
    to(value) { return value; },
    from(value) { return value === null ? null : Number(value); },
};

export const Property = new EntitySchema({
    name: "Property",
    tableName: "properties",
    columns: {
        id: { type: "uuid", primary: true },
        name: { type: "varchar", length: 100 },
        address: { type: "varchar", length: 200 },
        city: { type: "varchar", length: 100 },
        type: { type: "varchar", length: 30, default: "apartment" },
        apartmentPrice: { name: "apartment_price", type: "numeric", precision: 18, scale: 2, nullable: true, transformer: numericTransformer },
        additionalCosts: { name: "additional_costs", type: "jsonb", default: () => "'[]'::jsonb" },
        purchaseDate: { name: "purchase_date", type: "date", nullable: true },
        notes: { type: "text", default: "" },
        status: { type: "varchar", length: 20, default: "active" },
        createdBy: { name: "created_by", type: "uuid", nullable: true },
        createdAt: { name: "created_at", type: "timestamptz", createDate: true },
        updatedAt: { name: "updated_at", type: "timestamptz", updateDate: true },
    },
    relations: {
        creator: {
            type: "many-to-one",
            target: "User",
            joinColumn: { name: "created_by" },
            onDelete: "CASCADE",
        },
        transactions: {
            type: "one-to-many",
            target: "PropertyTransaction",
            inverseSide: "property",
        },
    },
});

export default Property;
