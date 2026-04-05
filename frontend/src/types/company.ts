// types/company.ts

export interface Company {
  companyId: number;

  email: string;
  passwordHash?: string;

  companyName: string;

  description?: string;
  websiteUrl?: string;

  industry?: string;
  location?: string;

  isApproved: boolean;

  createdAt: string;
}