// types/admin.ts

export interface Admin {
  adminId: number;
  email: string;
  passwordHash?: string;
}