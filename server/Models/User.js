import { EntitySchema } from "typeorm";
import { toPublicUser } from "./userData.js";

export { toPublicUser };

export const User = new EntitySchema({
    name: "User",
    tableName: "users",
    columns: {
        id: { type: "uuid", primary: true },
        name: { type: "varchar", length: 80 },
        email: { type: "varchar", length: 254, unique: true },
        passwordHash: { name: "password_hash", type: "varchar", length: 100 },
        createdAt: { name: "created_at", type: "timestamptz", createDate: true },
    },
});

export default User;
