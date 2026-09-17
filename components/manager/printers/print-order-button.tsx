"use client";
import { useEffect, useState } from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CheckoutResponse } from "@/lib/cart-types";
import type { Locale } from "@/lib/i18n";
import { routingTranslations } from "@/lib/printer-routing-translations";

export function PrintOrderButton({order}:{order:CheckoutResponse}) {
  const [locale,setLocale]=useState<Locale>("en");
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  const [error,setError]=useState(false);
  useEffect(()=>{setLocale(document.documentElement.lang.startsWith("zh")?"zh":document.documentElement.lang==="ko"?"ko":"en")},[]);
  const copy=routingTranslations[locale];
  async function print() {
    if(busy)return;
    setBusy(true);setMessage("");setError(false);
    try{
      const id=order.orderId??order.id;
      if(!id||!order.locationId)throw new Error(copy.blocked);
      const response=await fetch(`/api/manager/printing/${order.locationId}/orders/${id}/reprint`,{
        method:"POST",headers:{"Accept-Language":locale==="zh"?"zh-CN":locale}
      });
      if(!response.ok)throw new Error(response.status===401?copy.auth:response.status===403?copy.denied:response.status>=500?copy.requestFailed:copy.blocked);
      setMessage(copy.queued);
    }catch(e){setError(true);setMessage((e as Error).message)}finally{setBusy(false)}
  }
  return <div className="flex max-w-xs flex-col items-end gap-2">
    <Button aria-label={copy.print} title={copy.print} size="icon" type="button" variant="outline" disabled={busy} onClick={()=>void print()}><Printer className="h-4 w-4"/></Button>
    {message&&<p role={error?"alert":"status"} className={`text-xs ${error?"text-red-700":"text-green-700"}`}>{message}</p>}
  </div>;
}
