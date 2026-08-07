import { redirect } from "next/navigation";

/**
 * Registration is unified with sign-in: a single "Continue with Google" screen
 * handles both (find-or-create on the backend). This route now just forwards to
 * /login, preserving any ?next= redirect target. The old email/password form
 * lives in git history and can be restored when the Resend email path lands.
 */
export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  redirect(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
}
