import { CalendarDays, Mail, Phone, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDictionary } from "@/lib/i18n";
import { getCurrentLocale } from "@/lib/i18n-server";

const profile = [
  { icon: UserRound, label: "Name", value: "Mei Lin" },
  { icon: Mail, label: "Email", value: "mei@example.com" },
  { icon: Phone, label: "Phone", value: "(416) 555-0198" },
  { icon: CalendarDays, label: "Birthday", value: "May 4" },
];

export default async function AccountPage() {
  const locale = await getCurrentLocale();
  const dict = getDictionary(locale);
  const labels = [dict.accountPage.fields.name, dict.accountPage.fields.email, dict.accountPage.fields.phone, dict.accountPage.fields.birthday];

  return (
    <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">{dict.accountPage.eyebrow}</p>
          <h1 className="mt-2 font-serif text-4xl font-semibold sm:text-5xl">{dict.accountPage.title}</h1>
        </div>
        <Button className="w-full sm:w-auto">{dict.accountPage.edit}</Button>
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {profile.map((item, index) => (
          <Card key={item.label}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <item.icon className="h-4 w-4 text-accent" />
                {labels[index]}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-semibold">{item.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
