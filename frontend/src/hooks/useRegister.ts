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
  phoneNumber?: string;
  country?: string;
  city?: string;
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

/** Matches AuthResponse.java */
export interface AuthResponse {
  token: string;
  role: string;
  id: number;
  email: string;
}

interface UseRegisterReturn {
  registerUser: (payload: RegisterUserPayload) => Promise<AuthResponse | null>;
  registerCompany: (payload: RegisterCompanyPayload) => Promise<AuthResponse | null>;
  resendVerification: (email: string) => Promise<boolean>;
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
    payload: unknown,
  ): Promise<T | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await post<T>(endpoint, payload);
      // NOTE: we deliberately do NOT store the token here.
      // For users:    the RegisterPage shows a "check your email" screen.
      // For companies: the backend doesn't approve immediately.
      // Storing the token early would let an unverified user access protected routes.
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

  /**
   * Asks the backend to resend the verification email.
   * Returns true on success (including "email not found" — backend is intentionally vague).
   */
  const resendVerification = async (email: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      await post("/auth/resend-verification", { email });
      return true;
    } catch (err: unknown) {
      const msg =
        (err as any)?.response?.data?.message ?? "Failed to resend. Please try again.";
      setError(msg);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const clearError = () => setError(null);

  return { registerUser, registerCompany, resendVerification, isLoading, error, clearError };
};
