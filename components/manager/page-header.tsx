export function ManagerPageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
      <div className="max-w-3xl">
        <p className="text-xs font-bold uppercase tracking-widest text-primary">{eyebrow}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-normal text-slate-950 sm:text-4xl">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
      </div>
      {actions ? <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto lg:shrink-0">{actions}</div> : null}
    </div>
  );
}
