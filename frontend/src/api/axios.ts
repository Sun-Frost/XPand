import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";

// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------

/**
 * Base URL is read from the Vite env variable VITE_API_URL.
 * Set it in .env.local for development, e.g.:
 *   VITE_API_URL=http://localhost:8000/api
 *
 * Falls back to "/api" so that a reverse-proxy can handle the prefix in prod.
 */
const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080/api";

/** Default timeout in milliseconds. */
const TIMEOUT_MS = 30_000;

/** Extended timeout for AI calls (Gemini can take 30–60s). */
export const AI_TIMEOUT_MS = 90_000;

// ---------------------------------------------------------------------------
// Instance
// ---------------------------------------------------------------------------

const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: TIMEOUT_MS,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  withCredentials: true, // send cookies / allow CORS credentials
});

// ---------------------------------------------------------------------------
// Request interceptor — attach auth token
// ---------------------------------------------------------------------------

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
    /**
     * TODO: Replace with your real token retrieval once auth is wired up.
     * For example, if you store the JWT in localStorage:
     *   const token = localStorage.getItem("access_token");
     * Or read it from a Zustand/Redux store slice.
     */
    const token: string | null = localStorage.getItem("access_token");

    if (token) {
      config.headers.set("Authorization", `Bearer ${token}`);
    }

    return config;
  },
  (error: unknown) => Promise.reject(error),
);

// ---------------------------------------------------------------------------
// Response interceptor — unwrap data & handle errors centrally
// ---------------------------------------------------------------------------

api.interceptors.response.use(
  // 2xx — pass the response through as-is
  (response: AxiosResponse) => response,

  // Non-2xx — normalise the error so callers get a consistent shape
  async (error: unknown) => {
    if (!axios.isAxiosError(error)) {
      return Promise.reject(error);
    }

    const status = error.response?.status;

    if (status === 401) {
      /**
       * TODO: trigger a logout / token-refresh flow once auth is implemented.
       * e.g. clearAuthState(); window.location.replace("/login");
       */
      console.warn("[axios] 401 Unauthorized — user session may have expired.");
    }

    if (status === 403) {
      console.warn("[axios] 403 Forbidden — insufficient permissions.");
    }

    if (status === 500) {
      console.error("[axios] 500 Internal Server Error — backend issue.");
    }

    // Re-reject so individual call-sites can still catch if needed
    return Promise.reject(error);
  },
);

// ---------------------------------------------------------------------------
// Typed helpers
// ---------------------------------------------------------------------------

/**
 * Unwraps the Axios envelope so callers deal with plain data, not AxiosResponse.
 *
 * Usage:
 *   const user = await get<User>("/users/me");
 */
export const get = <T>(
  url: string,
  config?: AxiosRequestConfig,
): Promise<T> =>
  api.get<T>(url, config).then((res) => res.data);

export const post = <T>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig,
): Promise<T> =>
  api.post<T>(url, data, config).then((res) => res.data);

export const put = <T>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig,
): Promise<T> =>
  api.put<T>(url, data, config).then((res) => res.data);

export const patch = <T>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig,
): Promise<T> =>
  api.patch<T>(url, data, config).then((res) => res.data);

export const del = <T>(
  url: string,
  config?: AxiosRequestConfig,
): Promise<T> =>
  api.delete<T>(url, config).then((res) => res.data);

// ---------------------------------------------------------------------------
// Default export — the raw instance, for edge-cases that need full control
// ---------------------------------------------------------------------------

export default api;