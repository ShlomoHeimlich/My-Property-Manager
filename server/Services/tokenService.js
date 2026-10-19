import jwt from "jsonwebtoken";

const jwtSecret = process.env.JWT_SECRET ||
    (process.env.NODE_ENV === "production"
        ? undefined
        : "development-only-secret-set-JWT_SECRET-before-deployment");

if (!jwtSecret) {
    throw new Error("JWT_SECRET must be configured in production");
}

export function createAccessToken(user) {
    return jwt.sign({ email: user.email }, jwtSecret, {
        subject: user.id,
        expiresIn: "1h",
    });
}

export function verifyAccessToken(token) {
    return jwt.verify(token, jwtSecret);
}