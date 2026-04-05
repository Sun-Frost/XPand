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

        // 401 = wrong password for this account type → try next
        // 403 = account exists but blocked (e.g. company pending approval)
        // Any other error → surface it immediately
        if (status === 401) {
          // Could be wrong account type, keep trying
          lastError =
            (err as any)?.response?.data?.message ?? "Invalid email or password.";
          continue;
        }

        if (status === 403) {
          lastError =
            (err as any)?.response?.data?.message ??
            "Account access denied. It may be pending approval.";
          break; // found the account, but access denied — don't try others
        }

        // Network error or 500 — surface immediately
        lastError =
          (err as any)?.response?.data?.message ??
          (err instanceof Error ? err.message : "An unexpected error occurred.");
        break;
      }
    }

    setError(lastError);
    setIsLoading(false);
  };

  const clearError = () => setError(null);

  return { login, isLoading, error, clearError };
};