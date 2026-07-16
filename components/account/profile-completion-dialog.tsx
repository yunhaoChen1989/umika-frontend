"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, Phone, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getAuthHeaders, normalizePayload } from "@/lib/cart-client";
import { getDictionary, type Locale } from "@/lib/i18n";
import { profileCompletionPromptEventName, profileCompletionPromptKey } from "@/lib/profile-completion-prompt";

type AccountProfile = {
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
};

function isMissingRequiredProfileInfo(profile: AccountProfile | null) {
  return !profile?.firstName?.trim() || !profile?.lastName?.trim() || !profile?.phone?.trim();
}

export function ProfileCompletionDialog({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);
  const copy = dict.profilePrompt;
  const [open, setOpen] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const dismissPrompt = useCallback(() => {
    localStorage.removeItem(profileCompletionPromptKey);
    setOpen(false);
    setError(null);
  }, []);

  const checkProfile = useCallback(async () => {
    if (localStorage.getItem(profileCompletionPromptKey) !== "1") {
      return;
    }

    if (!localStorage.getItem("umika_access_token")) {
      localStorage.removeItem(profileCompletionPromptKey);
      return;
    }

    const response = await fetch("/api/me/profile", {
      method: "GET",
      headers: getAuthHeaders(),
      cache: "no-store",
    }).catch(() => null);

    if (!response?.ok) {
      return;
    }

    const profile = normalizePayload<AccountProfile>(await response.json().catch(() => null));

    if (!isMissingRequiredProfileInfo(profile)) {
      localStorage.removeItem(profileCompletionPromptKey);
      setOpen(false);
      return;
    }

    setFirstName(profile?.firstName ?? "");
    setLastName(profile?.lastName ?? "");
    setPhone(profile?.phone ?? "");
    setOpen(true);
  }, []);

  useEffect(() => {
    void checkProfile();

    function onPromptRequested() {
      void checkProfile();
    }

    function onStorage(event: StorageEvent) {
      if (event.key === profileCompletionPromptKey || event.key === "umika_access_token") {
        void checkProfile();
      }
    }

    window.addEventListener(profileCompletionPromptEventName, onPromptRequested);
    window.addEventListener("umika-auth-changed", onPromptRequested);
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener(profileCompletionPromptEventName, onPromptRequested);
      window.removeEventListener("umika-auth-changed", onPromptRequested);
      window.removeEventListener("storage", onStorage);
    };
  }, [checkProfile]);

  async function saveProfile() {
    setError(null);
    setIsSaving(true);

    const headers = getAuthHeaders();
    headers.set("Content-Type", "application/json");

    const response = await fetch("/api/me/profile", {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        preferredLanguage: locale,
      }),
    }).catch(() => null);

    setIsSaving(false);

    if (!response?.ok) {
      const body = response ? await response.json().catch(() => null) : null;
      setError(typeof body?.message === "string" ? body.message : copy.error);
      return;
    }

    localStorage.removeItem(profileCompletionPromptKey);
    setOpen(false);
    window.dispatchEvent(new Event("umika-auth-changed"));
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => (nextOpen ? setOpen(true) : dismissPrompt())}>
      <DialogContent className="w-full max-w-lg">
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium" htmlFor="profilePromptFirstName">
              {copy.firstName}
              <div className="mt-2 flex items-center gap-2 rounded-md border bg-background px-3">
                <UserRound className="h-4 w-4 text-muted-foreground" />
                <input
                  id="profilePromptFirstName"
                  autoComplete="given-name"
                  className="h-11 w-full bg-transparent text-sm outline-none"
                  onChange={(event) => setFirstName(event.target.value)}
                  placeholder={copy.firstNamePlaceholder}
                  type="text"
                  value={firstName}
                />
              </div>
            </label>
            <label className="block text-sm font-medium" htmlFor="profilePromptLastName">
              {copy.lastName}
              <input
                id="profilePromptLastName"
                autoComplete="family-name"
                className="mt-2 h-11 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                onChange={(event) => setLastName(event.target.value)}
                placeholder={copy.lastNamePlaceholder}
                type="text"
                value={lastName}
              />
            </label>
          </div>
          <label className="block text-sm font-medium" htmlFor="profilePromptPhone">
            {copy.phone}
            <div className="mt-2 flex items-center gap-2 rounded-md border bg-background px-3">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <input
                id="profilePromptPhone"
                autoComplete="tel"
                className="h-11 w-full bg-transparent text-sm outline-none"
                onChange={(event) => setPhone(event.target.value)}
                placeholder={copy.phonePlaceholder}
                type="tel"
                value={phone}
              />
            </div>
          </label>
          {error ? (
            <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{error}</p>
            </div>
          ) : null}
        </div>
        <DialogFooter className="justify-end">
          <Button disabled={isSaving} type="button" variant="outline" onClick={dismissPrompt}>
            {copy.later}
          </Button>
          <Button disabled={isSaving || !firstName.trim() || !lastName.trim() || !phone.trim()} type="button" onClick={saveProfile}>
            {isSaving ? copy.saving : copy.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
