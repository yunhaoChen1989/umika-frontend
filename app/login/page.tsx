import { LoginForm } from "@/components/auth/login-form";
import { getSafeRedirectPath } from "@/lib/auth-redirect";
import { getDictionary } from "@/lib/i18n";
import { getCurrentLocale } from "@/lib/i18n-server";

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{
    redirect?: string | string[];
  }>;
}) {
  const locale = await getCurrentLocale();
  const dict = getDictionary(locale);
  const params = await searchParams;
  const redirectPath = getSafeRedirectPath(params?.redirect);

  return (
    <section className="mx-auto grid min-h-[calc(100svh-12rem)] max-w-7xl items-center px-4 py-12 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-widest text-primary">{dict.loginPage.eyebrow}</p>
        <h1 className="mt-2 font-serif text-4xl font-semibold leading-tight sm:text-5xl">{dict.loginPage.title}</h1>
        <p className="mt-5 max-w-md text-muted-foreground">
          {dict.loginPage.copy}
        </p>
      </div>
      <LoginForm copy={dict.loginPage} redirectPath={redirectPath} />
    </section>
  );
}
