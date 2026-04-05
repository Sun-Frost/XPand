import { useState, useEffect, useCallback } from "react";
import { get, del } from "../../api/axios";

// ---------------------------------------------------------------------------
// Enums — mirrors ApplicationStatus.java exactly
// FIXED: was using SHORTLISTED which doesn't exist in backend
// ---------------------------------------------------------------------------

export type ApplicationStatus =
  | "PENDING"
  | "SHORTLISTED"
  | "REJECTED"
  | "WITHDRAWN";

// ---------------------------------------------------------------------------
// API response type — mirrors ApplicationResponse.java exactly
// ---------------------------------------------------------------------------

export interface ApplicationResponse {
  id: number;
  userId: number;
  userFullName: string;
  jobId: number;
  jobTitle: string;
  prioritySlotRank: number | null;
  status: ApplicationStatus;
  appliedAt: string; // ISO datetime string from LocalDateTime
}

// ---------------------------------------------------------------------------
// Hook return type
// ---------------------------------------------------------------------------

export interface UseApplicationsReturn {
  applications: ApplicationResponse[];
  isLoading: boolean;
  error: string | null;
  withdraw: (applicationId: number) => Promise<boolean>;
  isWithdrawing: boolean;
  refetch: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const extractError = (err: unknown, fallback: string): string =>
  (err as any)?.response?.data?.message ??
  (err instanceof Error ? err.message : fallback);

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export const useApplications = (): UseApplicationsReturn => {
  const [applications, setApplications] = useState<ApplicationResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    get<ApplicationResponse[]>("/user/applications")
      .then((data) => {
        if (!cancelled) setApplications(data);
      })
      .catch((err) => {
        if (!cancelled) setError(extractError(err, "Failed to load applications."));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, [tick]);

  /**
   * Withdraw an application.
   * Backend: DELETE /api/user/applications/:applicationId
   * Sets status → WITHDRAWN optimistically on success.
   */
  const withdraw = useCallback(async (applicationId: number): Promise<boolean> => {
    setIsWithdrawing(true);
    try {
      await del(`/user/applications/${applicationId}`);
      setApplications((prev) =>
        prev.map((a) =>
          a.id === applicationId ? { ...a, status: "WITHDRAWN" as ApplicationStatus } : a
        )
      );
      return true;
    } catch (err) {
      throw new Error(extractError(err, "Failed to withdraw application."));
    } finally {
      setIsWithdrawing(false);
    }
  }, []);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  return { applications, isLoading, error, withdraw, isWithdrawing, refetch };
};