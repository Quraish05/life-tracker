import type { MealLog } from "@/types/meal";
import { capitalize, shortDate, shortTime } from "@/components/food/_lib";

/** The reader's "recently logged" list: date on the left, time · slot on the right. */
export function RecentlyLogged({ logs }: { logs: MealLog[] }) {
  return (
    <ul className="mt-2 divide-y divide-border">
      {logs.map((meal) => (
        <li
          key={meal.id}
          className="flex items-center justify-between py-2 text-[13px]"
        >
          <span className="font-semibold text-foreground">
            {shortDate(meal.log_date)}
          </span>
          <span className="text-muted">
            {shortTime(meal.created_at)} · {capitalize(meal.slot)}
          </span>
        </li>
      ))}
    </ul>
  );
}
