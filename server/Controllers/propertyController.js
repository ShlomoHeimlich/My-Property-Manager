import {
    changePropertyStatus,
    createTransaction,
    createProperty,
    deleteTransaction,
    editProperty,
    getPropertiesForUser,
    getPropertyForUser,
    getPropertyTransactions,
} from "../Services/propertyService.js";
import { handleApiError, sendSuccess } from "../middlewares/apiResponse.js";

export async function list(request, response) {
    try {
        const includeInactive = request.query.includeInactive === "true";
        const properties = await getPropertiesForUser(request.auth.sub, includeInactive);
        return sendSuccess(response, 200, `נמצאו ${properties.length} נכסים`, { properties });
    } catch (error) {
        return handleApiError(response, error);
    }
}

export async function getOne(request, response) {
    try {
        const property = await getPropertyForUser(request.params.id, request.auth.sub);
        return sendSuccess(response, 200, "פרטי הנכס נטענו בהצלחה", { property });
    } catch (error) {
        return handleApiError(response, error);
    }
}

export async function create(request, response) {
    try {
        const property = await createProperty(request.body, request.auth.sub);
        return sendSuccess(response, 201, "הנכס נוצר בהצלחה", { property });
    } catch (error) {
        return handleApiError(response, error);
    }
}

export async function update(request, response) {
    try {
        const property = await editProperty(request.params.id, request.body, request.auth.sub);
        return sendSuccess(response, 200, "פרטי הנכס נשמרו בהצלחה", { property });
    } catch (error) {
        return handleApiError(response, error);
    }
}

export async function setStatus(request, response) {
    try {
        const property = await changePropertyStatus(
            request.params.id,
            request.body?.status,
            request.auth.sub,
        );
        const message = property.status === "sold" ? "הנכס סומן כנמכר" : "הנכס הועבר לארכיון";
        return sendSuccess(response, 200, message, { property });
    } catch (error) {
        return handleApiError(response, error);
    }
}

export async function listTransactions(request, response) {
    try {
        const transactions = await getPropertyTransactions(
            request.params.id,
            { month: request.query.month, year: request.query.year },
            request.auth.sub,
        );
        return sendSuccess(response, 200, `נטענו ${transactions.length} תנועות`, { transactions });
    } catch (error) {
        return handleApiError(response, error);
    }
}

export async function addTransaction(request, response) {
    try {
        const transaction = await createTransaction(
            request.params.id,
            request.body,
            request.auth.sub,
        );
        const message = transaction.type === "income" ? "ההכנסה נשמרה בהצלחה" : "ההוצאה נשמרה בהצלחה";
        return sendSuccess(response, 201, message, { transaction });
    } catch (error) {
        return handleApiError(response, error);
    }
}

export async function removeTransaction(request, response) {
    try {
        await deleteTransaction(
            request.params.id,
            request.params.transactionId,
            request.auth.sub,
        );
        return sendSuccess(response, 200, "התנועה נמחקה בהצלחה");
    } catch (error) {
        return handleApiError(response, error);
    }
}