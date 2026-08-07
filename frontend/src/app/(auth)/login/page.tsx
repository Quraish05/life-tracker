"use client";

import { useState } from "react";

import { AuthScreen } from "@/components/auth/auth-layout";
import { GoogleButton } from "@/components/auth/google-button";
import { FormError } from "@/components/ui/atoms/form-error";

export default function LoginPage() {
  const [error, setError] = useState<string | undefined>();

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
          Welcome to <span className="font-display italic text-grape">Thyme</span>
        </>
      }
      subtitle="Sign in or create your account with Google"
      footer={
        <span className="text-xs text-muted/80">
          We only use your Google account to sign you in.
        </span>
      }
    >
      <div className="space-y-4 rounded-3xl border border-border/60 bg-surface/80 p-7 shadow-xl shadow-grape/10 backdrop-blur-xl">
        <FormError message={error} />
        <GoogleButton onError={setError} />
      </div>
    </AuthScreen>
  );
}
