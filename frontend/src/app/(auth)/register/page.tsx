"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { registerSchema, type RegisterInput } from "@/lib/validations/auth";
import { AuthCard, AuthScreen } from "@/components/auth/auth-layout";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";

export default function RegisterPage() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    mode: "onTouched",
  });

  async function onSubmit(values: RegisterInput) {
    // TODO: wire up real registration. For now, just enter the app.
    void values;
    router.push("/dashboard");
  }

  return (
    <AuthScreen
      brandTitle={
        <>
          Start your{" "}
          <span className="font-display italic text-grape">journey today</span>.
        </>
      }
      brandDescription={
        <>
          Create an account and begin tracking the habits, moods, and milestones
          that make your days yours. ✨
        </>
      }
      title={
        <>
          Create your{" "}
          <span className="font-display italic text-grape">account</span>
        </>
      }
      subtitle="A joyful little place, just for you"
      footer={
        <>
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-semibold text-grape hover:text-grape-deep"
          >
            Sign in
          </Link>
        </>
      }
    >
      <AuthCard onSubmit={handleSubmit(onSubmit)} noValidate>
        <FormField
          label="Username"
          id="username"
          type="text"
          autoComplete="username"
          placeholder="janedoe"
          error={errors.username?.message}
          {...register("username")}
        />
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
          autoComplete="new-password"
          placeholder="••••••••"
          error={errors.password?.message}
          {...register("password")}
        />
        <Button type="submit" size="block" disabled={isSubmitting}>
          {isSubmitting ? "Creating account…" : "Create account"}
        </Button>
      </AuthCard>
    </AuthScreen>
  );
}
