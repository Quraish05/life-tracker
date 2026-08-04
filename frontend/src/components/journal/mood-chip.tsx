import { MOOD_BY_KEY, type MoodKey } from "@/lib/validations/note";
import { MOOD_WASH } from "@/constants/journal";

const SIZES = {
  sm: "px-2.5 py-0.5 text-[10.5px]",
  md: "px-2.5 py-1 text-[11px]",
  lg: "px-3 py-1 text-[11.5px]",
} as const;

type Props = {
  mood: MoodKey | null | undefined;
  /** `sm` — list row; `md` — drawer preview; `lg` — the full reader. */
  size?: keyof typeof SIZES;
  className?: string;
};

/** The mood-wash pill for a journal entry. Renders nothing when there's no mood.
 *  Shared by the list row, the preview drawer, and the full reader. */
export function MoodChip({ mood, size = "md", className = "" }: Props) {
  if (!mood) return null;
  const m = MOOD_BY_KEY[mood];

  return (
    <span
      className={`flex-none rounded-full font-bold ${MOOD_WASH[m.key]} ${SIZES[size]} ${className}`}
    >
      {m.label}
    </span>
  );
}
