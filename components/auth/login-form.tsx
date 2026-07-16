"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, LogIn, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { defaultPostLoginPath, getSafeRedirectPath } from "@/lib/auth-redirect";
import { requestProfileCompletionPrompt } from "@/lib/profile-completion-prompt";

type LoginCopy = {
  email: string;
  emailPlaceholder: string;
  password: string;
  passwordPlaceholder: string;
  login: string;
  loggingIn: string;
  or: string;
  continueWithGoogle: string;
  googleUnavailable: string;
  newHere: string;
  createAccount: string;
  genericError: string;
};

type AuthSuccessResponse = {
  accessToken?: string;
  tokenType?: string;
};

type GoogleCredentialResponse = {
  credential?: string;
};

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (options: { client_id: string; callback: (response: GoogleCredentialResponse) => void }) => void;
          renderButton: (element: HTMLElement, options: { theme: "outline"; size: "large"; width?: number; text?: "continue_with" }) => void;
        };
      };
    };
  }
}

export function LoginForm({ copy, redirectPath }: { copy: LoginCopy; redirectPath: string }) {
  const router = useRouter();
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const [postLoginPath, setPostLoginPath] = useState(redirectPath);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [isGoogleReady, setIsGoogleReady] = useState(false);
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";

  useEffect(() => {
    if (redirectPath !== defaultPostLoginPath || !document.referrer) {
      setPostLoginPath(redirectPath);
      return;
    }

    const referrerUrl = new URL(document.referrer);

    if (referrerUrl.origin !== window.location.origin) {
      setPostLoginPath(redirectPath);
      return;
    }

    setPostLoginPath(getSafeRedirectPath(`${referrerUrl.pathname}${referrerUrl.search}`));
  }, [redirectPath]);

  useEffect(() => {
    if (!googleClientId) {
      return;
    }

    let cancelled = false;

    function initializeGoogle() {
      if (cancelled || !window.google?.accounts?.id || !googleButtonRef.current) {
        return;
      }

      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: (response) => {
          void handleGoogleCredential(response.credential);
        },
      });
      googleButtonRef.current.innerHTML = "";
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: "outline",
        size: "large",
        text: "continue_with",
        width: googleButtonRef.current.offsetWidth || 320,
      });
      setIsGoogleReady(true);
    }

    const existingScript = document.querySelector<HTMLScriptElement>('script[src="https://accounts.google.com/gsi/client"]');

    if (existingScript) {
      initializeGoogle();
      existingScript.addEventListener("load", initializeGoogle, { once: true });
      return () => {
        cancelled = true;
        existingScript.removeEventListener("load", initializeGoogle);
      };
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = initializeGoogle;
    document.head.appendChild(script);

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [googleClientId]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: formData.get("email"),
        password: formData.get("password"),
      }),
    }).catch(() => null);

    setIsSubmitting(false);

    if (!response?.ok) {
      const body = response ? await response.json().catch(() => null) : null;
      setError(typeof body?.message === "string" ? body.message : copy.genericError);
      return;
    }

    const body = (await response.json().catch(() => null)) as AuthSuccessResponse | null;

    if (body?.accessToken) {
      localStorage.setItem("umika_access_token", body.accessToken);
      localStorage.setItem("umika_token_type", body.tokenType ?? "Bearer");
      window.dispatchEvent(new Event("umika-auth-changed"));
    }

    router.push(postLoginPath);
    router.refresh();
  }

  async function handleGoogleCredential(credential: string | undefined) {
    if (!credential) {
      setError(copy.genericError);
      return;
    }

    setError(null);
    setIsGoogleSubmitting(true);

    const response = await fetch("/api/auth/google", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ credential }),
    }).catch(() => null);

    setIsGoogleSubmitting(false);

    if (!response?.ok) {
      const body = response ? await response.json().catch(() => null) : null;
      setError(typeof body?.message === "string" ? body.message : copy.genericError);
      return;
    }

    const body = (await response.json().catch(() => null)) as AuthSuccessResponse | null;

    if (body?.accessToken) {
      localStorage.setItem("umika_access_token", body.accessToken);
      localStorage.setItem("umika_token_type", body.tokenType ?? "Bearer");
      requestProfileCompletionPrompt();
      window.dispatchEvent(new Event("umika-auth-changed"));
    }

    router.push(postLoginPath);
    router.refresh();
  }

  return (
    <form className="mt-8 rounded-lg border bg-card p-4 shadow-soft sm:p-6 lg:mt-0" method="post" onSubmit={onSubmit}>
      <label className="text-sm font-medium" htmlFor="email">
        {copy.email}
      </label>
      <div className="mt-2 flex items-center gap-2 rounded-md border bg-background px-3">
        <Mail className="h-4 w-4 text-muted-foreground" />
        <input
          id="email"
          name="email"
          autoComplete="email"
          className="h-11 w-full bg-transparent text-sm outline-none"
          placeholder={copy.emailPlaceholder}
          required
          type="email"
        />
      </div>
      <label className="mt-5 block text-sm font-medium" htmlFor="password">
        {copy.password}
      </label>
      <input
        id="password"
        name="password"
        autoComplete="current-password"
        className="mt-2 h-11 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        placeholder={copy.passwordPlaceholder}
        required
        type="password"
      />
      {error ? (
        <div className="mt-4 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      ) : null}
      <Button className="mt-6 w-full" disabled={isSubmitting} size="lg">
        <LogIn className="h-4 w-4" />
        {isSubmitting ? copy.loggingIn : copy.login}
      </Button>
      <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-widest text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        <span>{copy.or}</span>
        <span className="h-px flex-1 bg-border" />
      </div>
      {googleClientId ? (
        <div className="space-y-2">
          <div ref={googleButtonRef} className="flex min-h-11 justify-center" aria-label={copy.continueWithGoogle} />
          {!isGoogleReady || isGoogleSubmitting ? (
            <Button className="w-full" disabled size="lg" type="button" variant="outline">
              {isGoogleSubmitting ? copy.loggingIn : copy.continueWithGoogle}
            </Button>
          ) : null}
        </div>
      ) : (
        <Button className="w-full" disabled size="lg" type="button" variant="outline">
          {copy.googleUnavailable}
        </Button>
      )}
      <p className="mt-4 text-center text-sm text-muted-foreground">
        {copy.newHere}{" "}
        <Link className="font-semibold text-primary" href={`/register?redirect=${encodeURIComponent(postLoginPath)}`}>
          {copy.createAccount}
        </Link>
      </p>
    </form>
  );
}
