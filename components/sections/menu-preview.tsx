import Link from "next/link";
import { Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDictionary, type Locale } from "@/lib/i18n";
import { getLocalizedMenuItems } from "@/lib/localized-data";

export function MenuPreview({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);
  const menuItems = getLocalizedMenuItems(locale);

  return (
    <section className="bg-background py-16 sm:py-20" aria-labelledby="guest-favorites-title">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-widest text-primary">{dict.home.menuEyebrow}</p>
            <h2 id="guest-favorites-title" className="mt-2 font-serif text-3xl font-semibold sm:text-4xl">
              {dict.home.menuTitle}
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
              {dict.home.menuCopy}
            </p>
          </div>
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href="/menu">{dict.home.seeFullMenu}</Link>
          </Button>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {menuItems.slice(0, 3).map((item) => (
            <Card key={item.id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <CardTitle>{item.name}</CardTitle>
                  <span className="font-semibold">${item.price}</span>
                </div>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col">
                <p className="text-sm leading-6 text-muted-foreground">{item.description}</p>
                <div className="mt-5 flex items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-2">
                    {item.tags.map((tag) => (
                      <Badge key={tag}>{tag}</Badge>
                    ))}
                  </div>
                  <Button size="icon" aria-label={`${dict.menuPage.add} ${item.name}`}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
