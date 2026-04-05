// types/application.ts

import { ApplicationStatus } from "./enums";

export interface Application {
  applicationId: number;

  userId: number;
  jobId: number;

  prioritySlotRank?: number;

  status: ApplicationStatus;

  appliedAt: string;
}