// types/skill.ts

import { DifficultyLevel } from "./enums";

export interface Skill {
  skillId: number;
  name: string;
  category: string;
  isActive: boolean;
}

export interface Question {
  questionId: number;

  skillId: number;

  difficultyLevel: DifficultyLevel;

  questionText: string;

  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;

  correctAnswer: string;

  points: number;
}