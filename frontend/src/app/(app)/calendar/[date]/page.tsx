import { redirect } from "next/navigation";

/**
 * The per-day view now lives on the Log page. A calendar day link just carries
 * its date over to /log, which loads that day's meals, movement, and summary.
 */
export default async function CalendarDayRedirect({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;
  redirect(`/log?date=${date}`);
}
