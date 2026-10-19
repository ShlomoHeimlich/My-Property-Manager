import {
    authenticateUser,
    AuthError,
    getUserById,
    registerUser,
} from "../Services/authService.js";
import { handleApiError, sendSuccess } from "../middlewares/apiResponse.js";

export async function register(request, response) {
    try {
        const result = await registerUser(request.body);
        return sendSuccess(response, 201, "החשבון נוצר בהצלחה", result);
    } catch (error) {
        return handleApiError(response, error);
    }
}

export async function login(request, response) {
    try {
        const result = await authenticateUser(request.body);
        return sendSuccess(response, 200, "התחברת בהצלחה", result);
    } catch (error) {
        return handleApiError(response, error);
    }
}

export async function currentUser(request, response) {
    try {
        const user = await getUserById(request.auth.sub);
        if (!user) {
            return handleApiError(response, new AuthError(401, "המשתמש אינו קיים עוד"));
        }

        return sendSuccess(response, 200, "החשבון נטען בהצלחה", { user });
    } catch (error) {
        return handleApiError(response, error);
    }
}