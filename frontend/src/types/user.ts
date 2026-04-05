// types/user.ts

export interface User {
  userId: number;
  email: string;
  passwordHash?: string;
  firstName: string;
  lastName: string;

  phoneNumber?: string;
  country?: string;
  city?: string;

  linkedinUrl?: string;
  githubUrl?: string;
  portfolioUrl?: string;

  profilePicture?: string;

  professionalTitle?: string;
  aboutMe?: string;

  xpBalance: number;

  createdAt: string;
}

export interface Education {
  educationId: number;
  userId: number;

  institutionName: string;
  degree: string;
  fieldOfStudy: string;

  startDate: string;
  endDate?: string;

  description?: string;
}

export interface WorkExperience {
  workId: number;
  userId: number;

  jobTitle: string;
  companyName: string;
  location?: string;

  startDate: string;
  endDate?: string;

  description?: string;
}

export interface Certification {
  certificationId: number;
  userId: number;

  name: string;
  issuingOrganization: string;

  issueDate: string;
  expirationDate?: string;
}

export interface Project {
  projectId: number;
  userId: number;

  title: string;
  description: string;

  technologiesUsed?: string;

  projectUrl?: string;
  githubUrl?: string;

  startDate?: string;
  endDate?: string;

  createdAt: string;
}

export interface ProjectSkill {
  projectId: number;
  skillId: number;
}

export interface PasswordResetToken {
  tokenId: number;
  userId: number;
  token: string;
  expiryDate: string;
}