"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Clock3, Mail, MapPin, Phone } from "lucide-react";

import { getDictionary, type Locale } from "@/lib/i18n";
import type { LocationDto } from "@/lib/location-types";

type BusinessHour = {
  id?: string | null;
  locationId?: string | null;
  dayOfWeek: number;
  openTime?: string | null;
  closeTime?: string | null;
  isClosed?: boolean | null;
};

type SpringPage<T> = {
  content?: T[];
};

export function FooterLocation({ locale, section = "full" }: { locale: Locale; section?: "full" | "contact" | "hours" }) {
  const dict = getDictionary(locale);
  const [location, setLocation] = useState<LocationDto | null>(null);
  const [businessHours, setBusinessHours] = useState<BusinessHour[]>([]);
  const searchParams = useSearchParams();

  useEffect(() => {
    const locationId = searchParams.get("locationId") ?? searchParams.get("location") ?? searchParams.get("storeId") ?? searchParams.get("store");
    const locationCode = searchParams.get("locationCode") ?? searchParams.get("storeCode");
    const url = new URL("/api/locations/current", window.location.origin);

    if (locationId) {
      url.searchParams.set("locationId", locationId);
    }

    if (locationCode) {
      url.searchParams.set("locationCode", locationCode);
    }

    let active = true;

    async function loadLocation() {
      const response = await fetch(url.toString(), {
        method: "GET",
        cache: "no-store",
      }).catch(() => null);

      if (!active) {
        return;
      }

      if (!response?.ok) {
        setLocation(null);
        return;
      }

      const nextLocation = (await response.json()) as LocationDto;
      setLocation(nextLocation);

      const nextLocationId = nextLocation.locationId ?? nextLocation.id;

      if (!nextLocationId) {
        setBusinessHours([]);
        return;
      }

      const hoursUrl = new URL("/api/business-hours", window.location.origin);
      hoursUrl.searchParams.set("locationId", nextLocationId);

      const hoursResponse = await fetch(hoursUrl.toString(), {
        method: "GET",
        cache: "no-store",
      }).catch(() => null);

      if (!active) {
        return;
      }

      if (!hoursResponse?.ok) {
        setBusinessHours([]);
        return;
      }

      const body = (await hoursResponse.json().catch(() => null)) as SpringPage<BusinessHour> | BusinessHour[] | null;
      const hours = Array.isArray(body) ? body : body?.content ?? [];
      setBusinessHours(hours.filter(isValidBusinessHour).sort((a, b) => a.dayOfWeek - b.dayOfWeek));
    }

    void loadLocation();

    return () => {
      active = false;
    };
  }, [searchParams]);

  if (!location) {
    return null;
  }

  const address = [
    location.addressLine1,
    location.addressLine2,
    [location.city, location.province, location.postalCode].filter(Boolean).join(", "),
    location.country,
  ].filter(Boolean);

  const contactContent = (
    <>
      <p className="font-medium text-background">{location.name}</p>
      {address.length > 0 ? (
        <div className="flex items-start gap-2">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-background/60" />
          <p>{address.join(" ")}</p>
        </div>
      ) : null}
      {location.phone ? (
        <a className="flex items-center gap-2 hover:text-background" href={`tel:${location.phone}`}>
          <Phone className="h-4 w-4 text-background/60" />
          {location.phone}
        </a>
      ) : null}
      {location.email ? (
        <a className="flex items-center gap-2 hover:text-background" href={`mailto:${location.email}`}>
          <Mail className="h-4 w-4 text-background/60" />
          {location.email}
        </a>
      ) : null}
    </>
  );
  const hoursContent = businessHours.length ? (
    <div className="flex items-start gap-2">
      <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-background/60" />
      <div>
        <p className="font-medium text-background">{dict.common.hours}</p>
        <div className="mt-1 space-y-0.5">
          {businessHours.map((hour) => (
            <p className="flex gap-2" key={hour.id ?? `${hour.locationId}-${hour.dayOfWeek}`}>
              <span className="min-w-20 text-background/60">{dict.common.daysShort[hour.dayOfWeek] ?? `${dict.common.day} ${hour.dayOfWeek}`}</span>
              <span>{hour.isClosed ? dict.common.closed : `${formatTime(hour.openTime)} - ${formatTime(hour.closeTime)}`}</span>
            </p>
          ))}
        </div>
      </div>
    </div>
  ) : null;

  if (section === "contact") {
    return <div className="mt-3 space-y-2 text-background/72">{contactContent}</div>;
  }

  if (section === "hours") {
    return hoursContent ? <div className="text-background/72">{hoursContent}</div> : null;
  }

  return (
    <div className="mt-3 space-y-2 text-background/72">
      {contactContent}
      {hoursContent}
    </div>
  );
}

function isValidBusinessHour(value: BusinessHour) {
  return Number.isInteger(value.dayOfWeek) && value.dayOfWeek >= 0 && value.dayOfWeek <= 6;
}

function formatTime(value: string | null | undefined) {
  return value?.slice(0, 5) || "--";
}
