import { cookies } from "next/headers";

import { defaultLocale, resolveLocale, type Locale } from "@/lib/i18n";

export async function getCurrentLocale(): Promise<Locale> {
  const store = await cookies();
  return resolveLocale(store.get("umika_locale")?.value ?? defaultLocale);
}
