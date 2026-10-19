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
    const databaseError = error?.driverError ?? error?.cause ?? error;
    const databaseCode = databaseError?.code;
    const databaseResponses = {
        "23505": [409, "הפרט כבר קיים במערכת. בדקו אם כתובת האימייל כבר רשומה.", "DUPLICATE_RECORD"],
        "23503": [400, "לא ניתן לשמור: אחד מהפריטים המקושרים אינו קיים.", "RELATED_RECORD_NOT_FOUND"],
        "22P02": [400, "אחד הערכים שנשלחו אינו בפורמט תקין.", "INVALID_VALUE_FORMAT"],
        "22007": [400, "תאריך אחד או יותר אינו תקין. בדקו את שדה תאריך הרכישה.", "INVALID_DATE"],
        "ECONNREFUSED": [503, "לא ניתן להתחבר למסד הנתונים. בדקו שהשרת וכתובת החיבור זמינים.", "DATABASE_UNAVAILABLE"],
        "ENOTFOUND": [503, "לא ניתן למצוא את שרת מסד הנתונים. בדקו את DATABASE_URL.", "DATABASE_HOST_NOT_FOUND"],
        "ETIMEDOUT": [503, "החיבור למסד הנתונים חרג מזמן ההמתנה. נסו שוב.", "DATABASE_TIMEOUT"],
        "28P01": [503, "מסד הנתונים דחה את פרטי ההתחברות. בדקו את DATABASE_URL.", "DATABASE_AUTH_FAILED"],
        "3D000": [503, "מסד הנתונים שהוגדר לא נמצא. בדקו את שם מסד הנתונים ב־DATABASE_URL.", "DATABASE_NOT_FOUND"],
    };
    const mappedDatabaseError = databaseResponses[databaseCode];
    const statusCode = mappedDatabaseError?.[0] ?? (Number.isInteger(error?.status) ? error.status : 500);
    const message = mappedDatabaseError?.[1] ?? (
        statusCode >= 500
            ? "השרת לא הצליח להשלים את הפעולה. נסו שוב בעוד רגע."
            : error.message
    );
    const code = mappedDatabaseError?.[2] ?? error?.code ?? (
        statusCode >= 500 ? "INTERNAL_SERVER_ERROR" : "REQUEST_FAILED"
    );

    if (statusCode >= 500) console.error(error);
    return sendFailure(response, statusCode, message, code);
}
