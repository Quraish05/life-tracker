"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { loginSchema, type LoginInput } from "@/lib/validations/auth";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import { readNextPath } from "@/lib/utils/next-path";
import { AuthCard, AuthScreen } from "@/components/auth/auth-layout";
import { Button } from "@/components/ui/atoms/button";
import { FormError } from "@/components/ui/atoms/form-error";
import { FormField } from "@/components/ui/molecules/form-field";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    mode: "onTouched",
  });

  async function onSubmit(values: LoginInput) {
    try {
      await login(values);
      router.replace(readNextPath() ?? "/dashboard");
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Something went wrong. Please try again.";
      setError("root", { message });
    }
  }

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
      <AuthCard onSubmit={handleSubmit(onSubmit)} noValidate>
        <FormError message={errors.root?.message} />
        <FormField
          label="Email"
          id="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          error={errors.email?.message}
          {...register("email")}
        />
        <FormField
          label="Password"
          id="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          error={errors.password?.message}
          action={
            <Link
              href="#"
              className="text-xs font-semibold text-grape hover:text-grape-deep"
            >
              Forgot?
            </Link>
          }
          {...register("password")}
        />
        <Button type="submit" size="block" disabled={isSubmitting}>
          {isSubmitting ? "Signing in…" : "Sign in"}
        </Button>
      </AuthCard>
    </AuthScreen>
  );
}
