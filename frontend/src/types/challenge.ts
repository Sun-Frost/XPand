// types/challenge.ts

import { ChallengeStatus } from "./enums";

export interface Challenge {
  challengeId: number;

  title: string;
  description?: string;

  challengeType: string;

  targetValue?: number;

  xpReward: number;

  isRepeatable: boolean;
}

export interface UserChallenge {
  userChallengeId: number;

  userId: number;
  challengeId: number;

  currentProgress: number;

  startDate: string;

  status: ChallengeStatus;
}