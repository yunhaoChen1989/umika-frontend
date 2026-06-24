import { cn } from "@/lib/utils";

const tones = {
  ACTIVE: "border-emerald-200 bg-emerald-50 text-emerald-800",
  INVITED: "border-amber-200 bg-amber-50 text-amber-800",
  DISABLED: "border-slate-200 bg-slate-100 text-slate-600",
  global: "border-primary/20 bg-primary/10 text-primary",
  store: "border-sky-200 bg-sky-50 text-sky-800",
};

export function StatusPill({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: keyof typeof tones;
}) {
  return (
    <span className={cn("inline-flex items-center rounded-md border px-2 py-1 text-xs font-semibold", tones[tone])}>
      {children}
    </span>
  );
}
