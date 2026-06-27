/* eslint-disable @next/next/no-img-element */
import { Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDictionary } from "@/lib/i18n";
import { getCurrentLocale } from "@/lib/i18n-server";
import { getLocalizedMenuItems } from "@/lib/localized-data";
import { resolveBackendMediaUrl } from "@/lib/media-url";

export default async function MenuPage() {
  const locale = await getCurrentLocale();
  const dict = getDictionary(locale);
  const menuItems = getLocalizedMenuItems(locale);

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">{dict.menuPage.eyebrow}</p>
          <h1 className="mt-2 font-serif text-4xl font-semibold sm:text-5xl">{dict.menuPage.title}</h1>
        </div>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
          {dict.menuPage.categories.map((category, index) => (
            <Button key={category} variant={index === 0 ? "default" : "outline"} size="sm">
              {category}
            </Button>
          ))}
        </div>
      </div>
      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {menuItems.map((item) => (
          <Card key={item.id} className="flex flex-col">
            <div className="aspect-[4/3] overflow-hidden rounded-t-md bg-muted">
              <img
                alt={item.name}
                className="h-full w-full object-cover"
                loading="lazy"
                src={resolveBackendMediaUrl(item.imageUrl) || "/images/umika-hero.png"}
              />
            </div>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle>{item.name}</CardTitle>
                  <p className="mt-2 text-sm text-muted-foreground">{item.category}</p>
                </div>
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
    </section>
  );
}
