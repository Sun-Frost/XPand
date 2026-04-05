import { useState } from "react";
import { post } from "../api/axios";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RegisterUserPayload {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface RegisterCompanyPayload {
  companyName: string;
  email: string;
  password: string;
  description: string;
  industry: string;
  location: string;
  websiteUrl: string;
}

/** Matches AuthResponse.java exactly */
export interface AuthResponse {
  token: string;
  role: string;
  id: number;
  email: string;
}

interface UseRegisterReturn {
  registerUser: (payload: RegisterUserPayload) => Promise<AuthResponse | null>;
  registerCompany: (payload: RegisterCompanyPayload) => Promise<AuthResponse | null>;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export const useRegister = (): UseRegisterReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async <T extends AuthResponse>(
    endpoint: string,
    payload: unknown
  ): Promise<T | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await post<T>(endpoint, payload);
      localStorage.setItem("access_token", data.token);
      localStorage.setItem(
        "user",
        JSON.stringify({ userId: data.id, email: data.email, role: data.role })
      );
      return data;
    } catch (err: unknown) {
      const msg =
        (err as any)?.response?.data?.message ??
        (err instanceof Error ? err.message : "Registration failed. Please try again.");
      setError(msg);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const registerUser = (payload: RegisterUserPayload) =>
    handleAuth<AuthResponse>("/auth/user/register", payload);

  const registerCompany = (payload: RegisterCompanyPayload) =>
    handleAuth<AuthResponse>("/auth/company/register", payload);

  const clearError = () => setError(null);

  return { registerUser, registerCompany, isLoading, error, clearError };
};