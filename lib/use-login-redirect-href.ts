"use client";

import { useMemo } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { getLoginRedirectHref } from "@/lib/auth-redirect";

export function useLoginRedirectHref() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return useMemo(() => {
    const query = searchParams.toString();
    return getLoginRedirectHref(`${pathname}${query ? `?${query}` : ""}`);
  }, [pathname, searchParams]);
}
