"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";

import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import { readNextPath } from "@/lib/utils/next-path";

/** Minimal shape of the Google Identity Services API we use. */
type GoogleIdConfig = {
  client_id: string;
  callback: (res: { credential: string }) => void;
};
type GoogleButtonOptions = {
  theme?: "outline" | "filled_blue" | "filled_black";
  size?: "small" | "medium" | "large";
  shape?: "rectangular" | "pill";
  text?: "signin_with" | "signup_with" | "continue_with";
  width?: number;
};
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: GoogleIdConfig) => void;
          renderButton: (el: HTMLElement, options: GoogleButtonOptions) => void;
        };
      };
    };
  }
}

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const GIS_SRC = "https://accounts.google.com/gsi/client";

/**
 * "Continue with Google" — renders Google's official Sign-In button, exchanges
 * the returned ID token for our session, and redirects on success. Errors are
 * surfaced via ``onError`` so the parent page can render its banner.
 *
 * When ``NEXT_PUBLIC_GOOGLE_CLIENT_ID`` is unset the button renders disabled
 * with a hint — so the app builds and runs before the OAuth client is created.
 */
export function GoogleButton({
  onError,
}: {
  onError?: (message: string) => void;
}) {
  const router = useRouter();
  const { loginWithGoogle } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  // Keep the latest sign-in handler in a ref: GIS invokes our callback from
  // outside React, so we must avoid capturing a stale closure.
  const handleCredential = useCallback(
    async (credential: string) => {
      try {
        await loginWithGoogle(credential);
        router.replace(readNextPath() ?? "/dashboard");
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.message
            : "Couldn't sign you in with Google. Please try again.";
        onError?.(message);
      }
    },
    [loginWithGoogle, router, onError],
  );
  const handlerRef = useRef(handleCredential);
  useEffect(() => {
    handlerRef.current = handleCredential;
  }, [handleCredential]);

  useEffect(() => {
    if (!scriptLoaded || !CLIENT_ID || !containerRef.current) return;
    const gis = window.google?.accounts.id;
    if (!gis) return;

    gis.initialize({
      client_id: CLIENT_ID,
      callback: (res) => handlerRef.current(res.credential),
    });
    gis.renderButton(containerRef.current, {
      theme: "outline",
      size: "large",
      shape: "pill",
      text: "continue_with",
      width: 320,
    });
  }, [scriptLoaded]);

  if (!CLIENT_ID) {
    return (
      <div className="space-y-2 text-center">
        <button
          type="button"
          disabled
          className="w-full cursor-not-allowed rounded-full border border-border/60 bg-surface/80 py-3 text-sm font-semibold text-muted"
        >
          Continue with Google
        </button>
        <p className="text-xs text-muted">
          Sign-in isn&apos;t configured yet.
        </p>
      </div>
    );
  }

  return (
    <>
      <Script
        src={GIS_SRC}
        strategy="afterInteractive"
        onLoad={() => setScriptLoaded(true)}
      />
      {/* GIS renders its own button into this centered container. */}
      <div ref={containerRef} className="flex justify-center" />
    </>
  );
}
