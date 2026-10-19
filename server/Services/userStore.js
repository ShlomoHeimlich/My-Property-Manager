import { dataSource } from "../database/dataSource.js";
import User from "../Models/User.js";

const users = () => dataSource.getRepository(User);

export async function findUserByEmail(email) {
    return users().findOneBy({ email });
}

export async function findUserById(id) {
    return users().findOneBy({ id });
}

export async function saveUser(user) {
    return users().save(user);
}
