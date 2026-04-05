// types/store.ts

import { StoreItemType, TransactionSourceType } from "./enums";

export interface StoreItem {
  itemId: number;

  name: string;
  description?: string;

  xpCost: number;
  isAvailable?: boolean;

  itemType: StoreItemType;
}

export interface UserPurchase {
  purchaseId: number;
  
  userId: number;
  itemId: number;
xpSpent: number;
purchasedAt: String;
  // associatedJobId?: number;

  // isUsed: boolean;

}

export interface XPTransaction {
  transactionId: number;

  userId: number;

  amount: number;

  sourceType: TransactionSourceType;

  referenceId?: number;

  createdAt: string;
}

export interface MockInterview {
  interviewId: number;

  purchaseId: number;

  questionsText?: string;

  userAnswersText?: string;

  aiFeedbackText?: string;

  createdAt: string;
}

export interface ReadinessReport {
  reportId: number;

  purchaseId: number;

  reportContent: string;

  generatedAt: string;
}