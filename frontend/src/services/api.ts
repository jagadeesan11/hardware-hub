/**
 * Thin fetch wrapper. Every API call in the app goes through here so auth
 * headers and error shaping live in exactly one place.
 */
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

export class ApiRequestError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

/**
 * The auth store pushes its token here rather than this module importing the
 * store — the store calls the API, so importing it back would be circular.
 */
let authToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export const setAuthToken = (token: string | null) => {
  authToken = token;
};

/** Registered once at startup so an expired token logs the user out cleanly. */
export const setUnauthorizedHandler = (handler: () => void) => {
  onUnauthorized = handler;
};

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
  /**
   * Non-2xx statuses whose JSON body is a meaningful result rather than a
   * failure — e.g. /health/db answers 503 with the diagnostic we want to show.
   */
  acceptStatuses?: number[];
  /** Skips the global 401 handler, so a failed login does not fire a logout. */
  skipAuthRedirect?: boolean;
};

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, headers, acceptStatuses = [], skipAuthRedirect = false, ...rest } = options;

  const response = await fetch(`${BASE_URL}/api${path}`, {
    ...rest,
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...headers,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  if (response.status === 204) return undefined as T;

  const payload = await response.json().catch(() => null);

  if (!response.ok && !acceptStatuses.includes(response.status)) {
    if (response.status === 401 && !skipAuthRedirect) onUnauthorized?.();

    const message =
      (payload as { error?: { message?: string } } | null)?.error?.message ??
      `Request failed with status ${response.status}`;
    throw new ApiRequestError(
      response.status,
      message,
      (payload as { error?: { details?: unknown } } | null)?.error?.details,
    );
  }

  return payload as T;
}
