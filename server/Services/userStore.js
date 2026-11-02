import { readJsonStore, updateJsonStore } from "./jsonStore.js";

export async function findUserByEmail(email) {
    const normalizedEmail = email.toLowerCase();
    return readJsonStore().users.find(
        (user) => typeof user.email === "string" && user.email.toLowerCase() === normalizedEmail,
    ) ?? null;
}

export async function findUserById(id) {
    return readJsonStore().users.find((user) => user.id === id) ?? null;
}

export async function saveUser(user) {
    return updateJsonStore((store) => {
        const alreadyExists = store.users.some(
            (savedUser) =>
                savedUser.id === user.id ||
                (typeof savedUser.email === "string" && savedUser.email.toLowerCase() === user.email.toLowerCase()),
        );
        if (alreadyExists) return false;
        store.users.push(user);
        return true;
    });
}
