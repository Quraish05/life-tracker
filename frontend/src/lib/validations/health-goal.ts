import { z } from "zod";

/** Goal types — key + display label/emoji, one source for schema and UI. */
export const goalTypes = [
  { key: "lose_weight", label: "Lose weight", emoji: "📉" },
  { key: "gain_muscle", label: "Gain muscle", emoji: "💪" },
  { key: "maintain", label: "Maintain", emoji: "⚖️" },
  { key: "gain_weight", label: "Gain weight", emoji: "📈" },
  { key: "general_fitness", label: "General fitness", emoji: "🏃" },
] as const;

export type GoalType = (typeof goalTypes)[number]["key"];
export const goalTypeKeys = goalTypes.map((g) => g.key) as [GoalType, ...GoalType[]];

export const activityLevels = [
  { key: "sedentary", label: "Sedentary" },
  { key: "light", label: "Lightly active" },
  { key: "moderate", label: "Moderately active" },
  { key: "active", label: "Active" },
  { key: "very_active", label: "Very active" },
] as const;

export type ActivityLevel = (typeof activityLevels)[number]["key"];
export const activityLevelKeys = activityLevels.map((a) => a.key) as [
  ActivityLevel,
  ...ActivityLevel[],
];

/** The API contract for a health goal — mirrors the backend Pydantic schema. */
export const healthGoalSchema = z.object({
  goal_type: z.enum(goalTypeKeys),
  current_weight_kg: z.number().min(20).max(400).nullable(),
  target_weight_kg: z.number().min(20).max(400).nullable(),
  height_cm: z.number().min(50).max(260).nullable(),
  activity_level: z.enum(activityLevelKeys).nullable(),
  timeframe_weeks: z.number().int().min(1).max(520).nullable(),
  note: z.string().max(300).nullable(),
});

export type HealthGoalInput = z.infer<typeof healthGoalSchema>;
