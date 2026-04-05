// types/job.ts

import { JobType, JobStatus, JobSkillImportance } from "./enums";

export interface JobPosting {
  jobId: number;

  companyId: number;

  title: string;
  description: string;

  location?: string;

  jobType: JobType;

  salaryRange?: string;

  deadline: string;

  status: JobStatus;
}

export interface JobSkillRequirement {
  jobId: number;
  skillId: number;
  importance: JobSkillImportance;
}