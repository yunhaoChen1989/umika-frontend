import { RegisterForm } from "@/components/auth/register-form";
import { getDictionary } from "@/lib/i18n";
import { getCurrentLocale } from "@/lib/i18n-server";

export default async function RegisterPage() {
  const locale = await getCurrentLocale();
  const dict = getDictionary(locale);

  return (
    <section className="mx-auto grid min-h-[calc(100svh-12rem)] max-w-7xl items-center px-4 py-12 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-widest text-primary">{dict.registerPage.eyebrow}</p>
        <h1 className="mt-2 font-serif text-4xl font-semibold leading-tight sm:text-5xl">{dict.registerPage.title}</h1>
        <p className="mt-5 max-w-md text-muted-foreground">{dict.registerPage.copy}</p>
      </div>
      <RegisterForm copy={dict.registerPage} locale={locale} />
    </section>
  );
}
