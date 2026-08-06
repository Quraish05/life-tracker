import type { HealthGoalInput } from "@/lib/validations/health-goal";

/** The user's persisted health goal (one per user). */
export type HealthGoal = HealthGoalInput & {
  id: number;
  created_at: string;
  updated_at: string;
};

/** Which window the Goal Evaluator judges. */
export type EvalScope = "today" | "week";

/** One factor helping or working against the goal — a row in the evaluator rail. */
export type GoalSignal = {
  emoji: string;
  text: string;
  value: string;
};

/** The AI's structured read on how a window aligns with the goal. */
export type GoalEvaluation = {
  alignment_score: number;
  verdict: string;
  readout: string;
  helping: GoalSignal[];
  hurting: GoalSignal[];
  adjustment: string;
};

export type GoalEvaluationResponse = {
  model: string;
  scope: EvalScope;
  evaluation: GoalEvaluation;
};
