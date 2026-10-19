import { EntitySchema } from "typeorm";

const numericTransformer = {
    to(value) { return value; },
    from(value) { return Number(value); },
};

export const PropertyTransaction = new EntitySchema({
    name: "PropertyTransaction",
    tableName: "property_transactions",
    columns: {
        id: { type: "uuid", primary: true },
        type: { type: "varchar", length: 10 },
        category: { type: "varchar", length: 40, default: "other" },
        customCategory: { name: "custom_category", type: "text", nullable: true },
        description: { type: "text" },
        amount: { type: "numeric", precision: 18, scale: 2, transformer: numericTransformer },
        date: { type: "date" },
        createdAt: { name: "created_at", type: "timestamptz", createDate: true },
    },
    relations: {
        property: {
            type: "many-to-one",
            target: "Property",
            joinColumn: { name: "property_id" },
            onDelete: "CASCADE",
        },
    },
    indices: [
        { columns: ["date"] },
        { columns: ["type"] },
    ],
});

export default PropertyTransaction;