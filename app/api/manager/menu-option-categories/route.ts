import type { NextRequest } from "next/server";
import { proxyManagerApi } from "@/lib/manager-api-proxy";

export async function GET(request: NextRequest) {
  return proxyManagerApi(request, "/manager/menu-option-categories");
}

export async function POST(request: NextRequest) {
  return proxyManagerApi(request, "/manager/menu-option-categories");
}

