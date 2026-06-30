import { NextResponse, type NextRequest } from "next/server";

const backendBaseUrl = (
  process.env.BACKEND_API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:8080/api/v1"
).replace(/\/$/, "");

type DefaultLocationPayload = {
  id?: string | null;
  locationId?: string | null;
  location_id?: string | null;
  locationCode?: string | null;
  location_code?: string | null;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  addressLine1?: string | null;
  address_line_1?: string | null;
  addressLine2?: string | null;
  address_line_2?: string | null;
  city?: string | null;
  province?: string | null;
  postalCode?: string | null;
  postal_code?: string | null;
  country?: string | null;
  isActive?: boolean | null;
  is_active?: boolean | null;
  createdAt?: string | null;
  created_at?: string | null;
  updatedAt?: string | null;
  updated_at?: string | null;
};

function normalizeLocation(payload: DefaultLocationPayload) {
  const id = payload.id ?? payload.locationId ?? payload.location_id ?? null;

  return {
    id,
    locationId: payload.locationId ?? payload.location_id ?? id,
    locationCode: payload.locationCode ?? payload.location_code ?? null,
    name: payload.name ?? "",
    phone: payload.phone ?? null,
    email: payload.email ?? null,
    addressLine1: payload.addressLine1 ?? payload.address_line_1 ?? "",
    addressLine2: payload.addressLine2 ?? payload.address_line_2 ?? null,
    city: payload.city ?? "",
    province: payload.province ?? "",
    postalCode: payload.postalCode ?? payload.postal_code ?? "",
    country: payload.country ?? null,
    isActive: payload.isActive ?? payload.is_active ?? null,
    createdAt: payload.createdAt ?? payload.created_at ?? null,
    updatedAt: payload.updatedAt ?? payload.updated_at ?? null,
  };
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const locationId = requestUrl.searchParams.get("locationId")?.trim();
  const locationCode = requestUrl.searchParams.get("locationCode")?.trim();
  const authorization = request.headers.get("authorization");
  const cookieToken = request.cookies.get("umika_access_token")?.value;
  const token = authorization?.replace(/^Bearer\s+/i, "") ?? cookieToken;
  const headers = new Headers();

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (!locationId && !locationCode && token) {
    const defaultResponse = await fetch(`${backendBaseUrl}/me/default-location`, {
      method: "GET",
      headers,
      cache: "no-store",
    }).catch(() => null);

    if (!defaultResponse) {
      return NextResponse.json({ message: "Unable to reach the Umika API." }, { status: 503 });
    }

    if (defaultResponse.ok) {
      return NextResponse.json(normalizeLocation((await defaultResponse.json()) as DefaultLocationPayload));
    }
  }

  const backendUrl = new URL(`${backendBaseUrl}/locations/current`);

  if (locationId) {
    backendUrl.searchParams.set("locationId", locationId);
  }

  if (locationCode) {
    backendUrl.searchParams.set("locationCode", locationCode);
  }

  const response = await fetch(backendUrl, {
    method: "GET",
    headers,
    cache: "no-store",
  }).catch(() => null);

  if (!response) {
    return NextResponse.json({ message: "Unable to reach the Umika API." }, { status: 503 });
  }

  if (!response.ok) {
    return NextResponse.json({ message: "Unable to load location." }, { status: response.status });
  }

  return NextResponse.json(await response.json());
}
