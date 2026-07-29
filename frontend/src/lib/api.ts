import type { LoginInput, RegisterInput } from "@/lib/validations/auth";
import type { AuthResponse, User } from "@/types/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const API_PREFIX = "/api/v1";

/** API origin + prefix, shared by the REST client and the WebSocket client
 * (see use-live-sync). Exported so the two can't drift apart. */
export const API_ORIGIN = API_BASE;
export const API_V1_PREFIX = API_PREFIX;

const TOKEN_KEY = "lt.token";

/** The auth token, persisted in localStorage and shared by every API client. */
export const tokenStore = {
  get: (): string | null =>
    typeof window === "undefined" ? null : localStorage.getItem(TOKEN_KEY),
  set: (token: string): void => localStorage.setItem(TOKEN_KEY, token),
  clear: (): void => localStorage.removeItem(TOKEN_KEY),
};

/** An error carrying the HTTP status and the backend's `detail` message. */
export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/** Whether an error is the "free AI quota exhausted" 429 from the backend. */
export function isQuotaError(err: unknown): err is ApiError {
  return err instanceof ApiError && err.status === 429;
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  token?: string;
};

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, token } = options;

  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${API_PREFIX}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, "Can't reach the server. Please try again.");
  }

  if (!res.ok) {
    throw new ApiError(res.status, await extractErrorMessage(res));
  }

  // 204 and other empty bodies have nothing to parse.
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/** Pull the FastAPI `detail` message out of an error response, with a sane fallback. */
async function extractErrorMessage(res: Response): Promise<string> {
  try {
    const data = await res.json();
    const detail = data?.detail;
    if (typeof detail === "string") return detail;
    // Pydantic validation errors come back as a list of {msg, loc, ...}.
    if (Array.isArray(detail) && detail[0]?.msg) return String(detail[0].msg);
  } catch {
    // fall through to the generic message
  }
  return "Something went wrong. Please try again.";
}

export const authApi = {
  register: (input: RegisterInput) =>
    request<AuthResponse>("/auth/register", { method: "POST", body: input }),

  login: (input: LoginInput) =>
    request<AuthResponse>("/auth/login", { method: "POST", body: input }),

  me: (token: string) => request<User>("/auth/me", { token }),
};
