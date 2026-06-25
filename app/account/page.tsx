import { AccountProfilePanel } from "@/components/account/account-profile";
import { getDictionary } from "@/lib/i18n";
import { getCurrentLocale } from "@/lib/i18n-server";

export default async function AccountPage() {
  const locale = await getCurrentLocale();
  const dict = getDictionary(locale);

  return (
    <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">{dict.accountPage.eyebrow}</p>
          <h1 className="mt-2 font-serif text-4xl font-semibold sm:text-5xl">{dict.accountPage.title}</h1>
        </div>
      </div>
      <AccountProfilePanel copy={dict.accountPage} />
    </section>
  );
}
