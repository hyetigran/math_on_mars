import type { QuizState } from "./types";

export interface QuizSettings {
  secondsPerQuestion: number;
  questionsPerWave: number;
  answerType?: "input" | "multiple-choice";
}

export const DEFAULT_QUIZ_SETTINGS: Readonly<QuizSettings> = {
  secondsPerQuestion: 8,
  questionsPerWave: 5,
  answerType: "input",
};

export function validQuizSettings(value: unknown): value is QuizSettings {
  if (!value || typeof value !== "object") return false;
  const settings = value as QuizSettings;
  return (
    Number.isInteger(settings.secondsPerQuestion) &&
    settings.secondsPerQuestion >= 1 &&
    settings.secondsPerQuestion <= 300 &&
    Number.isInteger(settings.questionsPerWave) &&
    settings.questionsPerWave >= 1 &&
    settings.questionsPerWave <= 20 &&
    (settings.answerType === undefined ||
      settings.answerType === "input" ||
      settings.answerType === "multiple-choice")
  );
}

// Older saved quizzes used one shared 30-second countdown.
export function quizTimeLimit(quiz?: QuizState): number {
  return quiz?.timeLimitMs ?? 30000;
}

// Normalize the full quiz's remaining budget to the original reward bands.
export function quizRewardTime(
  quiz: QuizState,
  remaining = quiz.remainingMs,
): number {
  return Math.max(0, (30000 * remaining) / quizTimeLimit(quiz));
}
