"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CalendarDays, Check, Copy, Gift, Globe2, Link2, Mail, Phone, Ticket, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type AccountProfile = {
  id: string;
  email: string;
  phone: string | null;
  firstName: string | null;
  lastName: string | null;
  birthday: string | null;
  preferredLanguage: string | null;
  loyaltyPoints: number | null;
  referralCode: string | null;
};

type AccountCopy = {
  edit: string;
  save: string;
  saving: string;
  cancel: string;
  loading: string;
  loginRequired: string;
  login: string;
  retry: string;
  notProvided: string;
  genericError: string;
  inviteTitle: string;
  inviteCopy: string;
  inviteLink: string;
  copyInviteLink: string;
  copied: string;
  fields: {
    name: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    birthday: string;
    loyaltyPoints: string;
    referralCode: string;
    preferredLanguage: string;
  };
};

export function AccountProfilePanel({ copy }: { copy: AccountCopy }) {
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "unauthenticated" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [inviteLink, setInviteLink] = useState("");
  const [hasCopiedInviteLink, setHasCopiedInviteLink] = useState(false);

  const loadProfile = useCallback(async () => {
    const token = localStorage.getItem("umika_access_token");

    if (!token) {
      setStatus("unauthenticated");
      return;
    }

    setStatus("loading");
    setError(null);

    const response = await fetch("/api/me/profile", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    }).catch(() => null);

    if (!response?.ok) {
      const body = response ? await response.json().catch(() => null) : null;
      setError(typeof body?.message === "string" ? body.message : copy.genericError);
      setStatus(response?.status === 401 || response?.status === 403 ? "unauthenticated" : "error");
      return;
    }

    setProfile((await response.json()) as AccountProfile);
    setStatus("ready");
    setIsEditing(false);
  }, [copy.genericError]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    if (!profile?.referralCode) {
      setInviteLink("");
      return;
    }

    const url = new URL("/register", window.location.origin);
    url.searchParams.set("ref", profile.referralCode);
    setInviteLink(url.toString());
  }, [profile?.referralCode]);

  if (status === "loading") {
    return (
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 6 }).map((_, index) => (
          <Card key={index}>
            <CardHeader>
              <div className="h-5 w-32 animate-pulse rounded bg-muted" />
            </CardHeader>
            <CardContent>
              <div className="h-6 w-44 animate-pulse rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <Card className="mt-8">
        <CardContent className="flex flex-col gap-4 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">{error ?? copy.loginRequired}</p>
          <Button asChild className="w-full sm:w-auto">
            <Link href="/login">{copy.login}</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (status === "error" || !profile) {
    return (
      <Card className="mt-8">
        <CardContent className="flex flex-col gap-4 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">{error ?? copy.genericError}</p>
          <Button className="w-full sm:w-auto" onClick={() => void loadProfile()} type="button" variant="outline">
            {copy.retry}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(" ");
  const fields = [
    { icon: UserRound, label: copy.fields.name, value: fullName || copy.notProvided },
    { icon: Mail, label: copy.fields.email, value: profile.email },
    { icon: Phone, label: copy.fields.phone, value: profile.phone || copy.notProvided },
    { icon: CalendarDays, label: copy.fields.birthday, value: formatBirthday(profile.birthday) ?? copy.notProvided },
    { icon: Gift, label: copy.fields.loyaltyPoints, value: String(profile.loyaltyPoints ?? 0) },
    { icon: Ticket, label: copy.fields.referralCode, value: profile.referralCode || copy.notProvided },
    { icon: Globe2, label: copy.fields.preferredLanguage, value: profile.preferredLanguage || copy.notProvided },
  ];

  if (isEditing) {
    return (
      <form
        className="mt-8 rounded-lg border bg-card p-4 shadow-soft sm:p-6"
        onSubmit={async (event) => {
          event.preventDefault();
          const token = localStorage.getItem("umika_access_token");

          if (!token) {
            setStatus("unauthenticated");
            return;
          }

          setError(null);
          setIsSaving(true);

          const formData = new FormData(event.currentTarget);
          const response = await fetch("/api/me/profile", {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              phone: String(formData.get("phone") ?? ""),
              firstName: String(formData.get("firstName") ?? ""),
              lastName: String(formData.get("lastName") ?? ""),
              birthday: String(formData.get("birthday") ?? "") || null,
              preferredLanguage: String(formData.get("preferredLanguage") ?? ""),
            }),
          }).catch(() => null);

          setIsSaving(false);

          if (!response?.ok) {
            const body = response ? await response.json().catch(() => null) : null;
            setError(typeof body?.message === "string" ? body.message : copy.genericError);
            return;
          }

          setProfile((await response.json()) as AccountProfile);
          setIsEditing(false);
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium" htmlFor="firstName">
              {copy.fields.firstName}
            </label>
            <input
              className="mt-2 h-11 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              defaultValue={profile.firstName ?? ""}
              id="firstName"
              name="firstName"
              type="text"
            />
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="lastName">
              {copy.fields.lastName}
            </label>
            <input
              className="mt-2 h-11 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              defaultValue={profile.lastName ?? ""}
              id="lastName"
              name="lastName"
              type="text"
            />
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="phone">
              {copy.fields.phone}
            </label>
            <input
              className="mt-2 h-11 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              defaultValue={profile.phone ?? ""}
              id="phone"
              name="phone"
              type="tel"
            />
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="birthday">
              {copy.fields.birthday}
            </label>
            <input
              className="mt-2 h-11 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              defaultValue={profile.birthday ?? ""}
              id="birthday"
              name="birthday"
              type="date"
            />
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="preferredLanguage">
              {copy.fields.preferredLanguage}
            </label>
            <select
              className="mt-2 h-11 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              defaultValue={profile.preferredLanguage ?? "en"}
              id="preferredLanguage"
              name="preferredLanguage"
            >
              <option value="en">English</option>
              <option value="zh">中文</option>
              <option value="ko">한국어</option>
            </select>
          </div>
        </div>
        {error ? (
          <p className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button
            className="w-full sm:w-auto"
            disabled={isSaving}
            onClick={() => {
              setError(null);
              setIsEditing(false);
            }}
            type="button"
            variant="outline"
          >
            {copy.cancel}
          </Button>
          <Button className="w-full sm:w-auto" disabled={isSaving} type="submit">
            {isSaving ? copy.saving : copy.save}
          </Button>
        </div>
      </form>
    );
  }

  return (
    <>
      <div className="mt-8 flex justify-end">
        <Button className="w-full sm:w-auto" onClick={() => setIsEditing(true)} type="button">
          {copy.edit}
        </Button>
      </div>
      {inviteLink ? (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Link2 className="h-4 w-4 text-accent" />
              {copy.inviteTitle}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{copy.inviteCopy}</p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <div className="flex min-h-11 flex-1 items-center rounded-md border bg-background px-3 text-sm">
                <span className="break-all">{inviteLink}</span>
              </div>
              <Button
                className="w-full sm:w-auto"
                onClick={async () => {
                  await navigator.clipboard.writeText(inviteLink);
                  setHasCopiedInviteLink(true);
                  window.setTimeout(() => setHasCopiedInviteLink(false), 1800);
                }}
                type="button"
                variant="outline"
              >
                {hasCopiedInviteLink ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {hasCopiedInviteLink ? copy.copied : copy.copyInviteLink}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {fields.map((item) => (
          <Card key={item.label}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <item.icon className="h-4 w-4 text-accent" />
                {item.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="break-words text-lg font-semibold">{item.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}

function formatBirthday(value: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "long",
    day: "numeric",
  }).format(date);
}
