"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { AuthCard, AuthScreen } from "@/components/auth/auth-layout";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault();
    // TODO: wire up real authentication. For now, just enter the app.
    router.push("/dashboard");
  };

  return (
    <AuthScreen
      brandTitle={
        <>
          Track your life,{" "}
          <span className="font-display italic text-grape">
            one day at a time
          </span>
          .
        </>
      }
      brandDescription={
        <>
          Habits, moods, and milestones — all in one joyful little place that
          grows with you. ✨
        </>
      }
      title={
        <>
          Welcome <span className="font-display italic text-grape">back</span>
        </>
      }
      subtitle="Let's pick up where you left off"
      footer={
        <>
          New here?{" "}
          <Link
            href="/register"
            className="font-semibold text-grape hover:text-grape-deep"
          >
            Create an account
          </Link>
        </>
      }
    >
      <AuthCard onSubmit={handleSubmit}>
        <FormField
          label="Email"
          id="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <FormField
          label="Password"
          id="password"
          type="password"
          required
          autoComplete="current-password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          action={
            <Link
              href="#"
              className="text-xs font-semibold text-grape hover:text-grape-deep"
            >
              Forgot?
            </Link>
          }
        />
        <Button type="submit" size="block">
          Sign in
        </Button>
      </AuthCard>
    </AuthScreen>
  );
}
