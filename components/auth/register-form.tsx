"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, LockKeyhole, Mail, Phone, User, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getLoginRedirectHref } from "@/lib/auth-redirect";
import type { Locale } from "@/lib/i18n";

type RegisterCopy = {
  firstName: string;
  firstNamePlaceholder: string;
  lastName: string;
  lastNamePlaceholder: string;
  email: string;
  emailPlaceholder: string;
  phone: string;
  phonePlaceholder: string;
  password: string;
  passwordPlaceholder: string;
  confirmPassword: string;
  confirmPasswordPlaceholder: string;
  register: string;
  registering: string;
  alreadyHaveAccount: string;
  login: string;
  passwordMismatch: string;
  genericError: string;
  referralApplied: string;
};

type AuthSuccessResponse = {
  accessToken?: string;
  tokenType?: string;
};

export function RegisterForm({ copy, locale, redirectPath }: { copy: RegisterCopy; locale: Locale; redirectPath: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [referralCode, setReferralCode] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setReferralCode(params.get("ref")?.trim() ?? "");
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    if (password !== confirmPassword) {
      setError(copy.passwordMismatch);
      return;
    }

    setIsSubmitting(true);
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        firstName: formData.get("firstName"),
        lastName: formData.get("lastName"),
        email: formData.get("email"),
        phone: formData.get("phone"),
        password,
        preferredLanguage: locale,
        referralCode: referralCode || null,
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
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium" htmlFor="firstName">
            {copy.firstName}
          </label>
          <div className="mt-2 flex items-center gap-2 rounded-md border bg-background px-3">
            <User className="h-4 w-4 text-muted-foreground" />
            <input
              id="firstName"
              name="firstName"
              autoComplete="given-name"
              className="h-11 w-full bg-transparent text-sm outline-none"
              placeholder={copy.firstNamePlaceholder}
              type="text"
            />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium" htmlFor="lastName">
            {copy.lastName}
          </label>
          <input
            id="lastName"
            name="lastName"
            autoComplete="family-name"
            className="mt-2 h-11 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            placeholder={copy.lastNamePlaceholder}
            type="text"
          />
        </div>
      </div>

      <label className="mt-5 block text-sm font-medium" htmlFor="email">
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

      <label className="mt-5 block text-sm font-medium" htmlFor="phone">
        {copy.phone}
      </label>
      <div className="mt-2 flex items-center gap-2 rounded-md border bg-background px-3">
        <Phone className="h-4 w-4 text-muted-foreground" />
        <input
          id="phone"
          name="phone"
          autoComplete="tel"
          className="h-11 w-full bg-transparent text-sm outline-none"
          placeholder={copy.phonePlaceholder}
          type="tel"
        />
      </div>

      <label className="mt-5 block text-sm font-medium" htmlFor="password">
        {copy.password}
      </label>
      <div className="mt-2 flex items-center gap-2 rounded-md border bg-background px-3">
        <LockKeyhole className="h-4 w-4 text-muted-foreground" />
        <input
          id="password"
          name="password"
          autoComplete="new-password"
          className="h-11 w-full bg-transparent text-sm outline-none"
          minLength={8}
          placeholder={copy.passwordPlaceholder}
          required
          type="password"
        />
      </div>

      <label className="mt-5 block text-sm font-medium" htmlFor="confirmPassword">
        {copy.confirmPassword}
      </label>
      <input
        id="confirmPassword"
        name="confirmPassword"
        autoComplete="new-password"
        className="mt-2 h-11 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        minLength={8}
        placeholder={copy.confirmPasswordPlaceholder}
        required
        type="password"
      />

      {referralCode ? (
        <input name="referralCode" type="hidden" value={referralCode} />
      ) : null}

      {referralCode ? (
        <p className="mt-4 rounded-md border bg-secondary px-3 py-2 text-sm text-secondary-foreground">
          {copy.referralApplied} {referralCode}
        </p>
      ) : null}

      {error ? (
        <div className="mt-4 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      ) : null}

      <Button className="mt-6 w-full" disabled={isSubmitting} size="lg">
        <UserPlus className="h-4 w-4" />
        {isSubmitting ? copy.registering : copy.register}
      </Button>
      <p className="mt-4 text-center text-sm text-muted-foreground">
        {copy.alreadyHaveAccount}{" "}
        <Link className="font-semibold text-primary" href={getLoginRedirectHref(redirectPath)}>
          {copy.login}
        </Link>
      </p>
    </form>
  );
}
