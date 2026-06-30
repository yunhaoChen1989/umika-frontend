"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, LogIn, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";

type LoginCopy = {
  email: string;
  emailPlaceholder: string;
  password: string;
  passwordPlaceholder: string;
  login: string;
  loggingIn: string;
  newHere: string;
  createAccount: string;
  genericError: string;
};

type AuthSuccessResponse = {
  accessToken?: string;
  tokenType?: string;
};

export function LoginForm({ copy, redirectPath }: { copy: LoginCopy; redirectPath: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

    router.push(redirectPath);
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
      <p className="mt-4 text-center text-sm text-muted-foreground">
        {copy.newHere}{" "}
        <Link className="font-semibold text-primary" href={`/register?redirect=${encodeURIComponent(redirectPath)}`}>
          {copy.createAccount}
        </Link>
      </p>
    </form>
  );
}
