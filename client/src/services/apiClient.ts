export type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T | null;
  error?: {
    code: string;
    details?: unknown;
  } | null;
};

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: unknown;

  constructor(
    message: string,
    status: number,
    code: string,
    details: unknown = null,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
const TOKEN_KEY = "property-manager-token";

export function getAuthToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  onSuccess?: (message: string) => void,
): Promise<T> {
  const headers = new Headers(options.headers);
  const token = getAuthToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  headers.set("Accept", "application/json");

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, { ...options, headers });
  } catch {
    throw new ApiError(
      "לא ניתן להתחבר לשרת. בדקו שהשרת פועל ונסו שוב.",
      0,
      "NETWORK_ERROR",
    );
  }

  let envelope: ApiEnvelope<T> | null = null;
  try {
    envelope = (await response.json()) as ApiEnvelope<T>;
  } catch {
    throw new ApiError(
      response.ok
        ? "השרת החזיר תשובה שלא ניתן לקרוא. נסו שוב."
        : `השרת החזיר שגיאה (${response.status}) ללא פירוט.`,
      response.status,
      "INVALID_SERVER_RESPONSE",
    );
  }

  if (!response.ok || !envelope.success) {
    throw new ApiError(
      envelope.message || `הפעולה נכשלה (${response.status})`,
      response.status,
      envelope.error?.code || "REQUEST_FAILED",
      envelope.error?.details,
    );
  }

  onSuccess?.(envelope.message);
  return envelope.data as T;
}

export function saveAuthToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearAuthToken() {
  localStorage.removeItem(TOKEN_KEY);
}
