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
 * Set it in .env.local for development:
 *   VITE_API_URL=http://localhost:8080/api
 *
 * Falls back to "/api" so a reverse-proxy can handle the prefix in production.
 */
const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080/api";

/** Default request timeout in milliseconds. */
const TIMEOUT_MS = 30_000;

/** Extended timeout for AI calls — Gemini can take 30–60 s. */
export const AI_TIMEOUT_MS = 90_000;

// ---------------------------------------------------------------------------
// Axios instance
// ---------------------------------------------------------------------------

const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: TIMEOUT_MS,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  withCredentials: true,
});

// ---------------------------------------------------------------------------
// Request interceptor — attach JWT from localStorage
// ---------------------------------------------------------------------------

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
    const token: string | null = localStorage.getItem("access_token");
    if (token) {
      config.headers.set("Authorization", `Bearer ${token}`);
    }
    return config;
  },
  (error: unknown) => Promise.reject(error),
);

// ---------------------------------------------------------------------------
// Response interceptor — centralised error handling
// ---------------------------------------------------------------------------

api.interceptors.response.use(
  (response: AxiosResponse) => response,

  async (error: unknown) => {
    if (!axios.isAxiosError(error)) {
      return Promise.reject(error);
    }

    const status = error.response?.status;

    if (status === 401) {
      // Session expired or token invalid — clear storage and redirect to login.
      // Skip the redirect if we're already on the login page to avoid a loop.
      localStorage.removeItem("access_token");
      localStorage.removeItem("role");
      localStorage.removeItem("user");
      if (!window.location.pathname.startsWith("/login")) {
        window.location.replace("/login");
      }
    }

    if (status === 403) {
      console.warn("[axios] 403 Forbidden — insufficient permissions.");
    }

    if (status === 500) {
      console.error("[axios] 500 Internal Server Error.");
    }

    return Promise.reject(error);
  },
);

// ---------------------------------------------------------------------------
// Typed helpers — unwrap the Axios envelope so callers get plain data
// ---------------------------------------------------------------------------

/**
 * HTTP GET — returns response body directly.
 * @example const user = await get<User>("/users/me");
 */
export const get = <T>(url: string, config?: AxiosRequestConfig): Promise<T> =>
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

export const del = <T>(url: string, config?: AxiosRequestConfig): Promise<T> =>
  api.delete<T>(url, config).then((res) => res.data);

// ---------------------------------------------------------------------------
// Default export — raw instance for edge-cases that need full Axios control
// ---------------------------------------------------------------------------

export default api;
