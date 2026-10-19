import { verifyAccessToken } from "../Services/tokenService.js";
import { sendFailure } from "./apiResponse.js";

export function authenticateToken(request, response, next) {
    const authorization = request.headers.authorization;
    const [scheme, token] = authorization?.split(" ") ?? [];

    if (scheme !== "Bearer" || !token) {
        return sendFailure(response, 401, "נדרשת התחברות כדי לבצע פעולה זו", "AUTH_TOKEN_REQUIRED");
    }

    try {
        request.auth = verifyAccessToken(token);
        return next();
    } catch {
        return sendFailure(response, 401, "פג תוקף החיבור. התחברו מחדש כדי להמשיך.", "AUTH_TOKEN_INVALID");
    }
}