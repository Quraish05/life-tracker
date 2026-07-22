"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // TODO: wire up real authentication. For now, just enter the app.
    router.push("/dashboard");
  }

  return (
    <div className="grid min-h-dvh flex-1 lg:grid-cols-2">
      {/* Left — brand & tagline */}
      <div className="relative flex flex-col justify-between overflow-hidden bg-gradient-to-br from-lilac via-blush to-peach p-10 lg:p-14">
        {/* Decorative pastel blobs */}
        <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-sky/60 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 right-0 h-80 w-80 rounded-full bg-mint/60 blur-3xl" />

        <div className="relative flex items-center gap-2.5">
          <div className="flex h-10 w-10 rotate-3 items-center justify-center rounded-xl bg-gradient-to-br from-grape to-coral text-sm font-bold text-white shadow-lg shadow-grape/30">
            LT
          </div>
          <span className="text-lg font-bold tracking-tight text-ink">
            Life <span className="font-display italic text-grape">Tracker</span>
          </span>
        </div>

        <div className="relative max-w-md">
          <h1 className="text-5xl font-bold leading-tight tracking-tight text-ink lg:text-6xl">
            Track your life,{" "}
            <span className="font-display italic text-grape">
              one day at a time
            </span>
            .
          </h1>
          <p className="mt-5 text-lg text-ink-soft">
            Habits, moods, and milestones — all in one joyful little place that
            grows with you. ✨
          </p>
        </div>

        <p className="relative text-sm text-ink-soft/80">
          Made with care for the everyday.
        </p>
      </div>

      {/* Right — login form */}
      <div className="flex items-center justify-center bg-cream px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-ink">
              Welcome{" "}
              <span className="font-display italic text-grape">back</span>
            </h2>
            <p className="mt-2 text-sm text-ink-soft">
              Let&apos;s pick up where you left off
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-4 rounded-3xl border border-white/60 bg-white/80 p-7 shadow-xl shadow-grape/10 backdrop-blur-xl"
          >
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="block text-sm font-semibold text-ink"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-transparent bg-cream/80 px-4 py-2.5 text-sm text-ink placeholder:text-ink-soft/60 transition focus:border-grape focus:bg-white focus:outline-none focus:ring-4 focus:ring-lilac"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="block text-sm font-semibold text-ink"
                >
                  Password
                </label>
                <a
                  href="#"
                  className="text-xs font-semibold text-grape hover:text-grape-deep"
                >
                  Forgot?
                </a>
              </div>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-transparent bg-cream/80 px-4 py-2.5 text-sm text-ink placeholder:text-ink-soft/60 transition focus:border-grape focus:bg-white focus:outline-none focus:ring-4 focus:ring-lilac"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-full bg-gradient-to-r from-grape to-coral px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-grape/30 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-grape/40 active:translate-y-0"
            >
              Sign in
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-ink-soft">
            New here?{" "}
            <a
              href="#"
              className="font-semibold text-grape hover:text-grape-deep"
            >
              Create an account
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
