import Link from "next/link";
import { LogIn, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getDictionary } from "@/lib/i18n";
import { getCurrentLocale } from "@/lib/i18n-server";

export default async function LoginPage() {
  const locale = await getCurrentLocale();
  const dict = getDictionary(locale);

  return (
    <section className="mx-auto grid min-h-[calc(100svh-12rem)] max-w-7xl items-center px-4 py-12 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-widest text-primary">{dict.loginPage.eyebrow}</p>
        <h1 className="mt-2 font-serif text-4xl font-semibold leading-tight sm:text-5xl">{dict.loginPage.title}</h1>
        <p className="mt-5 max-w-md text-muted-foreground">
          {dict.loginPage.copy}
        </p>
      </div>
      <form className="mt-8 rounded-lg border bg-card p-4 shadow-soft sm:p-6 lg:mt-0">
        <label className="text-sm font-medium" htmlFor="email">
          {dict.loginPage.email}
        </label>
        <div className="mt-2 flex items-center gap-2 rounded-md border bg-background px-3">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <input
            id="email"
            className="h-11 w-full bg-transparent text-sm outline-none"
            placeholder={dict.loginPage.emailPlaceholder}
            type="email"
          />
        </div>
        <label className="mt-5 block text-sm font-medium" htmlFor="password">
          {dict.loginPage.password}
        </label>
        <input
          id="password"
          className="mt-2 h-11 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          placeholder={dict.loginPage.passwordPlaceholder}
          type="password"
        />
        <Button className="mt-6 w-full" size="lg">
          <LogIn className="h-4 w-4" />
          {dict.loginPage.login}
        </Button>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          {dict.loginPage.newHere}{" "}
          <Link className="font-semibold text-primary" href="/rewards">
            {dict.loginPage.createAccount}
          </Link>
        </p>
      </form>
    </section>
  );
}
