"use client";

import Link from "next/link";

import { useLoginRedirectHref } from "@/lib/use-login-redirect-href";

export function LoginRedirectLink({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const href = useLoginRedirectHref();

  return (
    <Link className={className} href={href}>
      {children}
    </Link>
  );
}
