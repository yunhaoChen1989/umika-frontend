"use client";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/lib/i18n";
import { flattenMenuCatalog, flattenMenuCategories, type ResolvedMenuCategory, type ResolvedMenuItem } from "@/lib/menu-catalog";
import { routingTranslations } from "@/lib/printer-routing-translations";

type Printer = { id: string; name: string; enabled: boolean };
type Routing = { printers: Printer[]; wholeOrderPrinterId: string; autoWholeOrder: boolean; itemRoutes: { menuItemId: string; printerId: string }[]; categoryRoutes: { categoryId: string; printerId: string }[] };
const field = "min-h-11 w-full min-w-0 rounded border bg-white px-3 py-2 text-base";
export function PrinterRoutingManager({locationId, locale}: {locationId:string; locale:Locale}) {
  const copy = routingTranslations[locale];
  const [value, setValue] = useState<Routing | null>(null);
  const [items, setItems] = useState<ResolvedMenuItem[]>([]);
  const [categories,setCategories] = useState<ResolvedMenuCategory[]>([]);
  const [search,setSearch] = useState("");
  const [selectedItem,setSelectedItem] = useState("");
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState("");
  const [message,setMessage] = useState("");
  useEffect(()=>{
    const controller = new AbortController();
    async function load() {
      const data = await Promise.all([
        fetch(`/api/manager/printing/${locationId}`,{signal:controller.signal,cache:"no-store",headers:{"Accept-Language":locale === "zh" ? "zh-CN" : locale}}),
        fetch(`/api/manager/menu-catalog?locationId=${locationId}`,{signal:controller.signal,cache:"no-store",headers:{"Accept-Language":locale === "zh" ? "zh-CN" : locale}}),
      ]);
      if(data.some(r=>!r.ok)) throw new Error(data.some(r=>r.status===403)?copy.denied:copy.error);
      const [config,menu] = await Promise.all(data.map(r=>r.json().then(v=>v?.data??v)));
      if(controller.signal.aborted)return;
      setValue({...config,wholeOrderPrinterId:config.wholeOrderPrinterId||"",itemRoutes:config.itemRoutes??[],categoryRoutes:config.categoryRoutes??[]});
      setItems(flattenMenuCatalog(menu,locale));
      setCategories(flattenMenuCategories(menu,locale));
    }
    void load().catch(e=>{if(!controller.signal.aborted)setError(e.message)});
    return ()=>controller.abort();
  },[locationId,locale,copy]);
  const filtered=useMemo(()=>search.trim()?items.filter(i=>i.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())&&!value?.itemRoutes.some(r=>r.menuItemId===i.id)).slice(0,20):[],[items,search,value?.itemRoutes]);
  const defaultSelected=Boolean(value?.printers.some(p=>p.id===value.wholeOrderPrinterId&&p.enabled));
  function editPrinter(id:string,change:Partial<Printer>) {
    setMessage("");setValue(v=>v&&({...v,printers:v.printers.map(p=>p.id===id?{...p,...change}:p),wholeOrderPrinterId:change.enabled===false&&v.wholeOrderPrinterId===id?"":v.wholeOrderPrinterId,itemRoutes:change.enabled===false?v.itemRoutes.filter(r=>r.printerId!==id):v.itemRoutes,categoryRoutes:change.enabled===false?v.categoryRoutes.filter(r=>r.printerId!==id):v.categoryRoutes}));
  }
  async function save() {
    if(!value)return;
    const names=value.printers.map(p=>p.name.trim().toLowerCase());
    if(names.some(n=>!n)||new Set(names).size!==names.length||!value.printers.some(p=>p.id===value.wholeOrderPrinterId&&p.enabled)){
      setError(copy.invalid);return;
    }
    setBusy(true);setError("");setMessage("");
    try{
      const response=await fetch(`/api/manager/printing/${locationId}/routing`,{method:"PUT",headers:{"Content-Type":"application/json","Accept-Language":locale==="zh"?"zh-CN":locale},body:JSON.stringify(value)});
      if(!response.ok)throw new Error(response.status===403?copy.denied:response.status===400?copy.invalid:copy.error);
      const result=await response.json();setValue(result?.data??result);setMessage(copy.saved);
    }catch(e){setError((e as Error).message)}finally{setBusy(false)}
  }
  return <section className="min-w-0 space-y-4 rounded-lg border bg-white p-4">
    <h2 className="font-semibold">{copy.title}</h2><p className="text-sm text-slate-600">{copy.help}</p>
    {error&&<p role="alert" className="text-sm text-red-700">{error}</p>}
    {message&&<p role="status" className="text-sm text-green-700">{message}</p>}
    {!value?<p>{copy.loading}</p>:<fieldset disabled={busy} className="min-w-0 space-y-4">
      <div className="grid gap-3 md:grid-cols-2">{value.printers.map(p=><div key={p.id} className="min-w-0 rounded border p-3">
        {p.enabled&&p.id===value.wholeOrderPrinterId&&<span className="mb-2 inline-flex rounded bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-900">{copy.defaultBadge}</span>}
        <label className="block text-sm">{copy.name}<input className={field} maxLength={80} value={p.name} onChange={e=>editPrinter(p.id,{name:e.target.value})}/></label>
        <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={p.enabled} onChange={e=>editPrinter(p.id,{enabled:e.target.checked})}/>{copy.enabled}</label>
      </div>)}</div>
      <Button variant="outline" disabled={value.printers.length>=16} onClick={()=>setValue({...value,printers:[...value.printers,{id:crypto.randomUUID(),name:"",enabled:true}]})}>{copy.add}</Button>
      <div className="min-w-0 rounded-lg border border-emerald-300 bg-emerald-50 p-4">
        <h3 className="font-semibold text-emerald-950">{copy.whole}</h3>
        <p className="mt-1 text-sm text-emerald-900">{copy.automaticHelp}</p>
        <label className="mt-3 block max-w-lg text-sm font-medium text-emerald-950">{copy.chooseDefault}
          <select className={field+" mt-1"} required value={defaultSelected?value.wholeOrderPrinterId:""} onChange={e=>{setError("");setValue({...value,wholeOrderPrinterId:e.target.value})}}>
            <option value="">{copy.chooseDefault}</option>{value.printers.filter(p=>p.enabled).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
        {!defaultSelected&&<p className="mt-2 text-sm text-amber-900">{copy.defaultRequired}</p>}
      </div>
      <h3 className="font-medium">{copy.categories}</h3>
      <p className="text-sm text-slate-600">{copy.categoryHelp}</p>
      <div className="divide-y rounded border">{categories.map(category=><div className="grid min-w-0 gap-2 p-3 sm:grid-cols-2 sm:items-center" key={category.id}>
        <span className="min-w-0 break-words font-medium">{category.name}</span>
        <select className={field} aria-label={copy.destination+" "+category.name} value={value.categoryRoutes.find(r=>r.categoryId===category.id)?.printerId||""} onChange={e=>setValue({...value,categoryRoutes:[...value.categoryRoutes.filter(r=>r.categoryId!==category.id),...(e.target.value?[{categoryId:category.id,printerId:e.target.value}]:[])]})}>
          <option value="">{copy.fallback}</option>{value.printers.filter(p=>p.enabled).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>)}</div>
      <h3 className="font-medium">{copy.items}</h3>
      <p className="text-sm text-slate-600">{copy.itemHelp}</p>
      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <div className="min-w-0"><input className={field} aria-label={copy.search} placeholder={copy.search} value={search} onChange={e=>{setSearch(e.target.value);setSelectedItem("")}}/>
          {search.trim()&&<select className={field+" mt-2"} size={Math.min(6,Math.max(2,filtered.length+1))} aria-label={copy.searchResults} value={selectedItem} onChange={e=>setSelectedItem(e.target.value)}>
            <option value="">{filtered.length?copy.chooseItem:copy.noItems}</option>{filtered.map(item=><option key={item.id} value={item.id}>{item.name} · {item.categoryName}</option>)}
          </select>}
        </div>
        <Button variant="outline" disabled={!selectedItem} onClick={()=>{setValue({...value,itemRoutes:[...value.itemRoutes,{menuItemId:selectedItem,printerId:value.wholeOrderPrinterId}]});setSearch("");setSelectedItem("")}}>{copy.addItem}</Button>
      </div>
      <div className="divide-y rounded border">{value.itemRoutes.map(route=>{const item=items.find(i=>i.id===route.menuItemId);return <div className="grid min-w-0 gap-2 p-3 sm:grid-cols-[1fr_1fr_auto] sm:items-center" key={route.menuItemId}>
        <span className="min-w-0 break-words">{item?`${item.name} · ${item.categoryName}`:route.menuItemId}</span>
        <select className={field} aria-label={copy.destination+" "+(item?.name??route.menuItemId)} value={route.printerId} onChange={e=>setValue({...value,itemRoutes:value.itemRoutes.map(r=>r.menuItemId===route.menuItemId?{...r,printerId:e.target.value}:r)})}>
          {value.printers.filter(p=>p.enabled).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <Button variant="outline" aria-label={copy.removeItem+" "+(item?.name??route.menuItemId)} onClick={()=>setValue({...value,itemRoutes:value.itemRoutes.filter(r=>r.menuItemId!==route.menuItemId)})}>{copy.removeItem}</Button>
      </div>})}</div>
      <Button onClick={()=>void save()}>{copy.save}</Button>
    </fieldset>}
  </section>;
}
