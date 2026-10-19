import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { toPublicUser } from "../Models/User.js";
import { createAccessToken } from "./tokenService.js";
import { findUserByEmail, findUserById, saveUser } from "./userStore.js";

export class AuthError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}

export async function registerUser(input = {}) {
    const name = typeof input.name === "string" ? input.name.trim() : "";
    const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
    const password = typeof input.password === "string" ? input.password : "";

    if (name.length < 2 || name.length > 80) {
        throw new AuthError(400, "יש להזין שם באורך 2 עד 80 תווים");
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
        throw new AuthError(400, "כתובת האימייל אינה תקינה");
    }
    if (password.length < 8 || Buffer.byteLength(password, "utf8") > 72) {
        throw new AuthError(400, "הסיסמה חייבת להכיל 8 עד 72 תווים");
    }
    if (await findUserByEmail(email)) {
        throw new AuthError(409, "כבר קיים חשבון עם כתובת האימייל הזו");
    }

    const user = {
        id: randomUUID(),
        name,
        email,
        passwordHash: await bcrypt.hash(password, 12),
    };
    await saveUser(user);

    return { token: createAccessToken(user), user: toPublicUser(user) };
}

export async function authenticateUser(input = {}) {
    const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
    const password = typeof input.password === "string" ? input.password : "";
    const user = await findUserByEmail(email);

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
        throw new AuthError(401, "האימייל או הסיסמה שגויים");
    }

    return { token: createAccessToken(user), user: toPublicUser(user) };
}

export async function getUserById(id) {
    const user = await findUserById(id);
    return user ? toPublicUser(user) : null;
}