/**
 * Centralized API utility for FocusPath
 * All fetch calls go through this module to ensure:
 * - Correct base URL (env var, no hardcoded localhost in production)
 * - Consistent headers and error handling
 * - Debug logging
 */

// Throw immediately if the env var is missing so misconfigured deployments
// are caught at startup rather than causing silent "Failed to fetch" errors.
if (!process.env.NEXT_PUBLIC_API_URL) {
  throw new Error(
    "NEXT_PUBLIC_API_URL is not set. " +
    "Add it to .env.local for local development " +
    "or set it as an environment variable in Vercel."
  );
}

const BASE_URL: string = process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, ""); // strip trailing slash

/**
 * Build a full API URL from a path like "/auth/login"
 */
export function apiUrl(path: string): string {
  const fullUrl = `${BASE_URL}${path}`;
  console.log("[API] Calling:", fullUrl);
  return fullUrl;
}

type FetchOptions = RequestInit & {
  token?: string | null;
};

/**
 * Generic API fetch wrapper.
 * - Adds Content-Type: application/json automatically
 * - Adds Authorization header when token is provided
 * - Throws an Error with the server's error message on non-2xx responses
 * - Catches network errors and re-throws with a helpful message
 */
export async function apiFetch<T = unknown>(
  path: string,
  options: FetchOptions = {}
): Promise<T> {
  const { token, headers: extraHeaders, body, ...rest } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(extraHeaders as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const url = apiUrl(path);

  let res: Response;
  try {
    res = await fetch(url, { headers, body, ...rest });
  } catch (err) {
    // Network-level error (no response from server)
    console.error("[API] Network error calling", url, err);
    throw new Error(
      "Failed to reach the server. Check your internet connection and ensure the backend is running."
    );
  }

  // Try to parse JSON regardless of status so we can surface backend error messages
  let data: unknown;
  try {
    data = await res.json();
  } catch {
    data = {};
  }

  if (!res.ok) {
    const msg =
      (data as Record<string, string>)?.error ||
      (data as Record<string, string>)?.message ||
      `Request failed with status ${res.status}`;
    console.error("[API] Error response from", url, res.status, msg);
    throw new Error(msg);
  }

  return data as T;
}
