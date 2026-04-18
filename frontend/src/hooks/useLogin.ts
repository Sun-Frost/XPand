import { useState } from "react";
import { post } from "../api/axios";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LoginCredentials {
  email: string;
  password: string;
}

/** Matches AuthResponse.java exactly */
interface AuthResponse {
  token: string;
  role: string;
  id: number;
  email: string;
}

interface UseLoginReturn {
  login: (credentials: LoginCredentials) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
}

type OnSuccessCallback = (role: string) => void;

// ---------------------------------------------------------------------------
// Endpoints to try in order
// ---------------------------------------------------------------------------

// Try company BEFORE user so company credentials don't accidentally receive
// a user-role token (which would cause 403s on all /company/* endpoints).
const LOGIN_ENDPOINTS = [
  "/auth/company/login",
  "/auth/user/login",
  "/auth/admin/login",
] as const;

// Messages that mean "we found the account but access is blocked" —
// these are definitive answers, not "wrong account type" errors.
// We must stop trying other endpoints when we see these.
const DEFINITIVE_BLOCK_PHRASES = [
  "verify your email",
  "verification",
  "pending approval",
  "suspended",
  "google sign-in",
];

const isDefinitiveBlock = (message: string): boolean => {
  const lower = message.toLowerCase();
  return DEFINITIVE_BLOCK_PHRASES.some(phrase => lower.includes(phrase));
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export const useLogin = (onSuccess?: OnSuccessCallback): UseLoginReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = async (credentials: LoginCredentials): Promise<void> => {
    setIsLoading(true);
    setError(null);

    let lastError: string = "Invalid email or password.";

    for (const endpoint of LOGIN_ENDPOINTS) {
      try {
        const data = await post<AuthResponse>(endpoint, credentials);

        // Normalise role to lowercase so all comparisons ('company', 'user', 'admin') are consistent
        const role = (data.role ?? "").toLowerCase();

        // Store token + normalised role as a top-level key for easy access
        localStorage.setItem("access_token", data.token);
        localStorage.setItem("role", role);
        localStorage.setItem(
          "user",
          JSON.stringify({
            userId: data.id,
            email: data.email,
            role,
          })
        );

        onSuccess?.(role);
        setIsLoading(false);
        return; // stop trying further endpoints
      } catch (err: unknown) {
        const status = (err as any)?.response?.status;
        const message: string =
          (err as any)?.response?.data?.message ??
          (err instanceof Error ? err.message : "An unexpected error occurred.");

        if (status === 401) {
          lastError = message;

          // If this 401 is a definitive block (e.g. "verify your email",
          // "pending approval") it means we found the account but access
          // is blocked — stop trying other endpoints immediately so the
          // user sees the real reason instead of a generic credential error.
          if (isDefinitiveBlock(message)) {
            break;
          }

          // Otherwise it's just "wrong account type for this endpoint" — keep trying
          continue;
        }

        if (status === 403) {
          // Found the account, but access denied — don't try others
          lastError = message || "Account access denied. It may be pending approval.";
          break;
        }

        // Network error or 500 — surface immediately
        lastError = message;
        break;
      }
    }

    setError(lastError);
    setIsLoading(false);
  };

  const clearError = () => setError(null);

  return { login, isLoading, error, clearError };
};
