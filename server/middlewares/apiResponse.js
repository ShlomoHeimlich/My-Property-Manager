export function sendSuccess(response, statusCode, message, data = null) {
    return response.status(statusCode).json({
        success: true,
        message,
        data,
    });
}

export function sendFailure(response, statusCode, message, code = "REQUEST_FAILED", details = null) {
    return response.status(statusCode).json({
        success: false,
        message,
        error: {
            code,
            ...(details ? { details } : {}),
        },
    });
}

export function handleApiError(response, error) {
    const statusCode = Number.isInteger(error?.status) ? error.status : 500;
    const message = (
        statusCode >= 500
            ? "השרת לא הצליח להשלים את הפעולה. נסו שוב בעוד רגע."
            : error.message
    );
    const code = error?.code ?? (
        statusCode >= 500 ? "INTERNAL_SERVER_ERROR" : "REQUEST_FAILED"
    );

    if (statusCode >= 500) console.error(error);
    return sendFailure(response, statusCode, message, code);
}
