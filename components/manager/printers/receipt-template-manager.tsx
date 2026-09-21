"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/lib/i18n";
import { receiptTemplateTranslations } from "@/lib/receipt-template-translations";

type FontSize = "COMPACT" | "STANDARD" | "LARGE";
type Template = {
  headerText: string; footerText: string; fontSize: FontSize;
  showCustomerPhone: boolean; showPlacedTime: boolean; showItemPrices: boolean;
  showSubtotal: boolean; showDiscount: boolean; showTax: boolean; showTip: boolean;
  showStationItemCount: boolean; showOrderTotal: boolean;
};
type Location = { id?: string; locationId?: string; name: string };
type BooleanKey = { [K in keyof Template]: Template[K] extends boolean ? K : never }[keyof Template];
const input = "mt-1 min-h-11 w-full min-w-0 rounded-md border bg-white px-3 py-2 text-base";

export function ReceiptTemplateManager({ locale }: { locale: Locale }) {
  const copy = receiptTemplateTranslations[locale];
  const searchKey = useSearchParams().toString();
  const [locations, setLocations] = useState<Location[]>([]);
  const [locationId, setLocationId] = useState("");
  const [value, setValue] = useState<Template | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const api = useCallback(async (path: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers);
    headers.set("Accept-Language", locale === "zh" ? "zh-CN" : locale);
    if (options.body) headers.set("Content-Type", "application/json");
    const response = await fetch(path, { ...options, headers, cache: "no-store" });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(response.status === 401 ? copy.auth : response.status === 403 ? copy.denied : response.status === 400 ? copy.invalid : copy.error);
    return payload?.data ?? payload;
  }, [copy, locale]);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      const [list, current] = await Promise.all([
        api("/api/manager/locations?page=0&size=300&sort=name,asc", { signal: controller.signal }),
        api("/api/locations/current", { signal: controller.signal }).catch(() => null),
      ]);
      const available: Location[] = Array.isArray(list) ? list : list.content ?? [];
      const query = new URLSearchParams(searchKey);
      let selected = query.get("locationId") || query.get("location") || "";
      if (!selected && query.get("locationCode")) {
        const resolved = await api(`/api/locations/resolve-id?locationCode=${encodeURIComponent(query.get("locationCode")!)}`, { signal: controller.signal });
        selected = typeof resolved === "string" ? resolved : resolved.locationId ?? resolved.id ?? "";
      }
      if (!controller.signal.aborted) {
        setLocations(available);
        setLocationId(selected || current?.id || current?.locationId || available[0]?.id || available[0]?.locationId || "");
      }
    })().catch((reason: Error) => { if (!controller.signal.aborted) setError(reason.message); });
    return () => controller.abort();
  }, [api, searchKey]);

  useEffect(() => {
    setValue(null); setError(""); setMessage("");
    if (!locationId) return;
    const controller = new AbortController();
    void api(`/api/manager/printing/${locationId}/receipt-template`, { signal: controller.signal })
      .then((result: Template) => { if (!controller.signal.aborted) setValue(result); })
      .catch((reason: Error) => { if (!controller.signal.aborted) setError(reason.message); });
    return () => controller.abort();
  }, [api, locationId]);

  function toggle(key: BooleanKey) {
    setValue(current => current ? { ...current, [key]: !current[key] } : current);
    setMessage("");
  }
  function Check({ field, label }: { field: BooleanKey; label: string }) {
    return <label className="flex min-h-11 items-center gap-3 rounded-md border px-3 py-2 text-sm">
      <input className="h-4 w-4 shrink-0" type="checkbox" checked={Boolean(value?.[field])} onChange={() => toggle(field)} />
      <span>{label}</span>
    </label>;
  }
  async function save() {
    if (!value || !locationId) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const result = await api(`/api/manager/printing/${locationId}/receipt-template`, { method: "PUT", body: JSON.stringify(value) });
      setValue(result); setMessage(copy.saved);
    } catch (reason) { setError((reason as Error).message); }
    finally { setBusy(false); }
  }

  const previewSize = value?.fontSize === "LARGE" ? "text-[17px]" : value?.fontSize === "COMPACT" ? "text-[13px]" : "text-[15px]";
  const showCompleteSummary = Boolean(value && (value.showSubtotal || value.showDiscount || value.showTax || value.showTip || value.showOrderTotal));
  const showStationSummary = Boolean(value && (value.showStationItemCount || value.showOrderTotal));
  return <div className="min-w-0 space-y-5">
    <header><p className="text-sm font-medium text-primary">{copy.eyebrow}</p><h1 className="text-2xl font-semibold">{copy.title}</h1><p className="mt-1 text-sm text-slate-600">{copy.description}</p></header>
    <label className="block max-w-lg text-sm font-medium">{copy.location}
      <select className={input} value={locationId} disabled={busy} onChange={event => setLocationId(event.target.value)}>
        <option value="">{copy.chooseLocation}</option>{locations.map(location => <option key={location.id ?? location.locationId} value={location.id ?? location.locationId}>{location.name}</option>)}
      </select>
    </label>
    {error && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {message && <p role="status" className="rounded-md bg-green-50 p-3 text-sm text-green-800">{message}</p>}
    {!value && locationId && !error && <p>{copy.loading}</p>}
    {value && <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <fieldset disabled={busy} className="min-w-0 space-y-5">
        <section className="space-y-4 rounded-lg border bg-white p-4">
          <h2 className="font-semibold">{copy.appearance}</h2>
          <label className="block text-sm font-medium">{copy.header}<input className={input} maxLength={80} placeholder={copy.headerPlaceholder} value={value.headerText} onChange={event => setValue({ ...value, headerText: event.target.value })} /></label>
          <label className="block text-sm font-medium">{copy.footer}<textarea className={input} rows={2} maxLength={160} placeholder={copy.footerPlaceholder} value={value.footerText} onChange={event => setValue({ ...value, footerText: event.target.value })} /></label>
          <label className="block text-sm font-medium">{copy.fontSize}<select className={input} value={value.fontSize} onChange={event => setValue({ ...value, fontSize: event.target.value as FontSize })}><option value="COMPACT">{copy.compact}</option><option value="STANDARD">{copy.standard}</option><option value="LARGE">{copy.large}</option></select></label>
        </section>
        <section className="space-y-3 rounded-lg border bg-white p-4"><h2 className="font-semibold">{copy.complete}</h2><div className="grid gap-2 sm:grid-cols-2"><Check field="showCustomerPhone" label={copy.customerPhone}/><Check field="showPlacedTime" label={copy.placedTime}/><Check field="showItemPrices" label={copy.itemPrices}/><Check field="showSubtotal" label={copy.subtotal}/><Check field="showDiscount" label={copy.discount}/><Check field="showTax" label={copy.tax}/><Check field="showTip" label={copy.tip}/><Check field="showOrderTotal" label={copy.orderTotal}/></div></section>
        <section className="space-y-3 rounded-lg border bg-white p-4"><h2 className="font-semibold">{copy.station}</h2><Check field="showStationItemCount" label={copy.stationCount}/></section>
        <Button onClick={() => void save()}>{copy.save}</Button>
      </fieldset>
      <aside className="min-w-0 space-y-2 xl:sticky xl:top-4 xl:self-start"><h2 className="font-semibold">{copy.preview}</h2><p className="text-sm text-slate-600">{copy.previewHelp}</p>
        <div className={`overflow-hidden rounded-lg border bg-white p-5 font-mono leading-snug shadow-sm ${previewSize}`}>
          <p className="mb-2 text-xs font-sans font-semibold uppercase tracking-wide text-slate-500">{copy.complete}</p>
          {value.headerText && <p className="mb-2 whitespace-pre-wrap text-center font-bold">{value.headerText}</p>}
          <p className="font-bold">#123456 · {copy.order}</p><p>{copy.customer}{value.showCustomerPhone ? ` · ${copy.phone}` : ""}</p><p className="my-1 text-lg font-bold">{copy.pickup}</p>{value.showPlacedTime && <p>{copy.placed}</p>}<hr className="my-2 border-dashed"/>
          <div className="flex gap-2 font-bold"><span className="min-w-0 flex-1">{copy.item}</span>{value.showItemPrices && <span>$17.00</span>}</div><p className="pl-4">{copy.note}</p>{showCompleteSummary && <hr className="my-2 border-dashed"/>}
          {value.showSubtotal && <p className="flex justify-between"><span>{copy.subtotal}</span><span>$26.50</span></p>}{value.showDiscount && <p className="flex justify-between"><span>{copy.discount}</span><span>-$2.00</span></p>}{value.showTax && <p className="flex justify-between"><span>{copy.tax}</span><span>$3.19</span></p>}{value.showTip && <p className="flex justify-between"><span>{copy.tip}</span><span>$4.00</span></p>}{value.showOrderTotal && <p className="flex justify-between font-bold"><span>{copy.orderTotal}</span><span>$31.69</span></p>}
          {value.footerText && <p className="mt-3 whitespace-pre-wrap text-center">{value.footerText}</p>}
        </div>
        <div className={`overflow-hidden rounded-lg border bg-white p-5 font-mono leading-snug shadow-sm ${previewSize}`}>
          <p className="mb-2 text-xs font-sans font-semibold uppercase tracking-wide text-slate-500">{copy.station}</p>
          {value.headerText && <p className="mb-2 whitespace-pre-wrap text-center font-bold">{value.headerText}</p>}
          <p className="font-bold">#123456 · {copy.stationOrder}</p><p>{copy.customer}</p><p className="my-1 text-lg font-bold">{copy.pickup}</p><hr className="my-2 border-dashed"/>
          <p className="font-bold">{copy.item}</p><p className="pl-4">{copy.note}</p>{showStationSummary && <hr className="my-2 border-dashed"/>}
          {value.showStationItemCount && <p className="flex justify-between"><span>{copy.stationCount}</span><span>2</span></p>}{value.showOrderTotal && <p className="flex justify-between font-bold"><span>{copy.orderTotal}</span><span>$31.69</span></p>}
          {value.footerText && <p className="mt-3 whitespace-pre-wrap text-center">{value.footerText}</p>}
        </div>
      </aside>
    </div>}
  </div>;
}
