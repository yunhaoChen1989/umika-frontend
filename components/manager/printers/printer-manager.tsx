"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/lib/i18n";
import { printerTranslations, printerAgentTranslations } from "@/lib/printer-translations";
import { PrinterRoutingManager } from "./printer-routing-manager";

type Config = { locationId: string; pollSeconds: number; lastSeen: string | null; paired: boolean; printers: { id: string; name: string; enabled: boolean }[] };
type Job = { id: string; printerName: string; state: string; createdAt: string; receipt: { orderNumber?: string } };
type Location = { id?: string; locationId?: string; name: string };

export function PrinterManager({ locale }: { locale: Locale }) {
  const copy = printerTranslations[locale];
  const agentCopy = printerAgentTranslations[locale];
  const searchKey = useSearchParams().toString();
  const [locations, setLocations] = useState<Location[]>([]);
  const [locationId, setLocationId] = useState("");
  const [config, setConfig] = useState<Config | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [key, setKey] = useState("");
  const api = useCallback(async (path: string, method = "GET", signal?: AbortSignal) => {
    const response = await fetch(path, { method, signal, cache: "no-store", headers: { "Accept-Language": locale === "zh" ? "zh-CN" : locale } });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(response.status === 401 ? copy.auth : response.status === 403 ? copy.denied : response.status >= 500 ? copy.unreachable : copy.error);
    return payload?.data ?? payload;
  }, [locale, copy]);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      const [list, current] = await Promise.all([
        api("/api/manager/locations?page=0&size=300&sort=name,asc", "GET", controller.signal),
        api("/api/locations/current", "GET", controller.signal).catch(() => null),
      ]);
      const available: Location[] = Array.isArray(list) ? list : list.content ?? [];
      const query = new URLSearchParams(searchKey);
      let id = query.get("locationId") || query.get("location") || "";
      if (!id && query.get("locationCode")) {
        const resolved = await api(`/api/locations/resolve-id?locationCode=${encodeURIComponent(query.get("locationCode")!)}`, "GET", controller.signal);
        id = typeof resolved === "string" ? resolved : resolved.locationId ?? resolved.id;
        if (!id) throw new Error(copy.error);
      }
      if (!controller.signal.aborted) {
        setLocations(available);
        setLocationId(id || current?.id || current?.locationId || available[0]?.id || available[0]?.locationId || "");
      }
    })().catch((e: Error) => { if (!controller.signal.aborted) setError(e.message); });
    return () => controller.abort();
  }, [api, searchKey, copy.error]);

  useEffect(() => {
    setConfig(null); setJobs([]); setKey(""); setError(""); setMessage("");
    if (!locationId) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    async function refresh() {
      try {
        const [data, history] = await Promise.all([
          api(`/api/manager/printing/${locationId}`, "GET", controller.signal),
          api(`/api/manager/printing/${locationId}/jobs`, "GET", controller.signal),
        ]);
        if (!controller.signal.aborted) { setConfig(data); setJobs(history); setError(""); }
      } catch (e) { if (!controller.signal.aborted) setError((e as Error).message); }
      if (!controller.signal.aborted) timer = setTimeout(refresh, 5000);
    }
    void refresh();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [api, locationId]);

  async function action(work: () => Promise<void>) {
    setBusy(true); setError(""); setMessage("");
    try { await work(); } catch (e) { setError((e as Error).message || copy.error); } finally { setBusy(false); }
  }
  const connected = config?.lastSeen && Date.now() - Date.parse(config.lastSeen) < Math.max(90000, config.pollSeconds * 3000);
  return <div className="min-w-0 space-y-5">
    <div><h1 className="text-2xl font-semibold">{copy.title}</h1><p className="mt-1 text-sm text-slate-600">{agentCopy.description}</p></div>
    <section className="space-y-3 rounded-lg border bg-white p-4">
      <h2 className="font-semibold">{agentCopy.setupTitle}</h2><p className="text-sm text-slate-600">{agentCopy.setupHelp}</p>
      <a className="inline-flex min-h-11 items-center text-sm font-medium text-primary underline" href="http://127.0.0.1:9123" target="_blank" rel="noreferrer">{copy.console}</a>
      <p className="text-sm text-slate-600">{copy.consoleHelp}</p>
    </section>
    <label className="block max-w-lg text-sm font-medium">{copy.location}
      <select className="mt-2 min-h-11 w-full min-w-0 rounded-md border bg-white px-3 py-2 text-base" value={locationId} disabled={busy} onChange={(e) => setLocationId(e.target.value)}>
        <option value="">{copy.choose}</option>{locations.map((l) => <option key={l.id ?? l.locationId} value={l.id ?? l.locationId}>{l.name}</option>)}
      </select>
    </label>
    {error && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {message && <p role="status" className="rounded-md bg-green-50 p-3 text-sm text-green-800">{message}</p>}
    {config && <>
      <Button asChild variant="outline"><Link href={`/manager/settings/receipt-templates?locationId=${encodeURIComponent(locationId)}`}>{agentCopy.receiptTemplate}</Link></Button>
      <PrinterRoutingManager key={locationId} locationId={locationId} locale={locale}/>
      <section className="space-y-3 rounded-lg border bg-white p-4">
        <h2 className="font-medium">{connected ? copy.paired : copy.offline}</h2>
        <p className="text-sm text-slate-600">{copy.lastSeen}: {config.lastSeen ? new Date(config.lastSeen).toLocaleString(locale) : copy.never}</p>
        <p className="text-sm text-slate-600">{copy.pairHelp}</p>
        <Button variant="outline" disabled={busy} onClick={() => {
          if (config.paired && !window.confirm(copy.pairConfirm)) return;
          void action(async () => { const result = await api(`/api/manager/printing/${locationId}/pair`, "POST"); setKey(result.token); setConfig({ ...config, paired: true, lastSeen: null }); });
        }}>{config.paired ? copy.rotate : copy.pair}</Button>
        {key && <div className="space-y-2"><code className="block break-all rounded bg-slate-100 p-3 text-sm">{key}</code><Button variant="outline" onClick={() => void action(async () => { await navigator.clipboard.writeText(key); setMessage(copy.copied); })}>{copy.copy}</Button></div>}
        <p className="text-sm text-slate-600">{config.printers.map((p) => p.name).join(" · ") || copy.empty}</p>
      </section>
      <section className="min-w-0 space-y-3 rounded-lg border bg-white p-4">
        <h2 className="font-semibold">{copy.jobs}</h2><p className="text-sm text-slate-600">{copy.sentHelp}</p>
        {!jobs.length && <p className="text-sm text-slate-500">{copy.noJobs}</p>}
        {jobs.map((j) => <div key={j.id} className="flex flex-wrap items-center justify-between gap-3 border-t py-3">
          <div className="min-w-0 break-words"><p className="font-medium">{j.receipt.orderNumber} · {j.printerName}</p><p className="text-sm text-slate-600">{copy[j.state as keyof typeof copy] ?? j.state} · {new Date(j.createdAt).toLocaleString(locale)}</p></div>
          {["SENT", "UNCERTAIN", "HELD"].includes(j.state) && <Button variant="outline" disabled={busy} onClick={() => {
            if (!window.confirm(copy.reprintConfirm)) return;
            void action(async () => { await api(`/api/manager/printing/${locationId}/jobs/${j.id}/reprint`, "POST"); setMessage(copy.reprintQueued); });
          }}>{copy.reprint}</Button>}
        </div>)}
      </section>
    </>}
  </div>;
}
