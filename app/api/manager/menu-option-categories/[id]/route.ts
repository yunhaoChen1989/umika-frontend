import type { NextRequest } from "next/server";
import { proxyManagerApi } from "@/lib/manager-api-proxy";

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  return proxyManagerApi(request, `/manager/menu-option-categories/${encodeURIComponent(id)}`);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  return proxyManagerApi(request, `/manager/menu-option-categories/${encodeURIComponent(id)}`);
}

