import lower from "../content/questions/im-lower.json";
import upper from "../content/questions/im-upper.json";
import type { Grade, Question, QuestionSource } from "./types";

import attribution from "../content/questions/attribution.json";
export const IM_ATTRIBUTION = attribution;

export interface BankItem extends Omit<Question, "source" | "spoken"> {
  grade: Grade;
  skill: string;
  standards: string[];
  source: {
    url: string;
    unit: number;
    section: string;
    problem: string;
    part: string;
    original: string;
    changes: string;
  };
}

// The checked-in JSON is audited by question-bank.test.ts, with provenance and answer-choice invariants.
export const QUESTION_BANK = [...lower, ...upper] as BankItem[];

export function bankQuestion(item: BankItem): Question {
  const { grade: _grade, source: reference, ...question } = item;
  const source: QuestionSource = {
    ...IM_ATTRIBUTION,
    itemId: item.id,
    ...reference,
  };
  return structuredClone({ ...question, spoken: item.prompt, source });
}
