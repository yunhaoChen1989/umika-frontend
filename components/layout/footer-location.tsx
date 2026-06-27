"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Mail, MapPin, Phone } from "lucide-react";

import type { LocationDto } from "@/lib/location-types";

export function FooterLocation() {
  const [location, setLocation] = useState<LocationDto | null>(null);
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

      setLocation((await response.json()) as LocationDto);
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

  return (
    <div className="mt-3 space-y-2 text-background/72">
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
    </div>
  );
}
