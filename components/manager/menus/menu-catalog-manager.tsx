"use client";

/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  ImagePlus,
  Pencil,
  Plus,
  RefreshCw,
  SquareStack,
  Store,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";

import { LoginRedirectLink } from "@/components/auth/login-redirect-link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { LocationDto, SpringPage } from "@/lib/location-types";
import type {
  LocationMenuOverrideDto,
  MenuCategoryDto,
  MenuItemDto,
  MenuItemImageDto,
  MenuOverrideTargetType,
} from "@/lib/menu-management-types";
import { resolveBackendMediaUrl } from "@/lib/media-url";
import { cn } from "@/lib/utils";

type MenuLocationContext = {
  locationId: string | null;
  locationCode: string | null;
};

type CurrentAccountProfile = {
  role?: string | null;
  roles?: string[] | null;
};

type LocationMenuOverrideWireDto = Partial<LocationMenuOverrideDto> & {
  location_id?: string | null;
  target_type?: MenuOverrideTargetType | string | null;
  target_id?: string | null;
  is_visible?: boolean | null;
  sort_order?: number | null;
  custom_name?: string | null;
  custom_description?: string | null;
  custom_price?: string | number | null;
  custom_image_url?: string | null;
};

type MenuFormState =
  | {
      kind: "category";
      id: string;
      locationId: string;
      name: string;
      description: string;
      sortOrder: string;
      isActive: boolean;
      isDeleted: boolean;
    }
  | {
      kind: "item";
      id: string;
      categoryId: string;
      locationId: string;
      name: string;
      description: string;
      price: string;
      sku: string;
      displayOrder: string;
      isAvailable: boolean;
      isActive: boolean;
      isDeleted: boolean;
    }
  | {
      kind: "override";
      id: string;
      locationId: string;
      targetType: MenuOverrideTargetType;
      targetId: string;
      targetName: string;
      globalName: string;
      globalDescription: string;
      globalPrice: string;
      isVisible: boolean;
      sortOrder: string;
      customName: string;
      customDescription: string;
      customPrice: string;
      customImageUrl: string;
      customImageFile: File | null;
      customImageFileLabel: string;
    }
  | {
      kind: "image";
      id: string;
      menuItemId: string;
      imageUrl: string;
      imageFile: File | null;
      fileLabel: string;
      isPrimary: boolean;
      sortOrder: string;
    };

type MenuTreeNode = {
  category: MenuCategoryDto;
  items: MenuItemNode[];
};

type MenuItemNode = {
  item: MenuItemDto;
  images: MenuItemImageDto[];
};

type ResolvedCatalogState = {
  categories: MenuCategoryDto[];
  items: MenuItemDto[];
  images: MenuItemImageDto[];
};

const currencyFormatter = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
});

const emptyCategoryForm = (locationId = ""): MenuFormState => ({
  kind: "category",
  id: "",
  locationId,
  name: "",
  description: "",
  sortOrder: "0",
  isActive: true,
  isDeleted: false,
});

const emptyItemForm = (categoryId = "", locationId = ""): MenuFormState => ({
  kind: "item",
  id: "",
  categoryId,
  locationId,
  name: "",
  description: "",
  price: "",
  sku: "",
  displayOrder: "0",
  isAvailable: true,
  isActive: true,
  isDeleted: false,
});

const emptyOverrideForm = (params: {
  locationId: string;
  targetType: MenuOverrideTargetType;
  targetId: string;
  targetName: string;
  globalName: string;
  globalDescription: string;
  globalPrice: string;
  override?: LocationMenuOverrideDto | null;
}): MenuFormState => ({
  kind: "override",
  id: params.override?.id ?? "",
  locationId: params.locationId,
  targetType: params.targetType,
  targetId: params.targetId,
  targetName: params.targetName,
  globalName: params.globalName,
  globalDescription: params.globalDescription,
  globalPrice: params.globalPrice,
  isVisible: params.override?.isVisible ?? true,
  sortOrder: String(params.override?.sortOrder ?? 0),
  customName: params.override?.customName ?? "",
  customDescription: params.override?.customDescription ?? "",
  customPrice: params.override?.customPrice?.toString() ?? "",
  customImageUrl: params.override?.customImageUrl ?? "",
  customImageFile: null,
  customImageFileLabel: "",
});

const emptyImageForm = (menuItemId = ""): MenuFormState => ({
  kind: "image",
  id: "",
  menuItemId,
  imageUrl: "",
  imageFile: null,
  fileLabel: "",
  isPrimary: false,
  sortOrder: "0",
});

function getErrorText(error: unknown) {
  return error instanceof Error && error.name !== "AbortError" ? error.message : null;
}

function readApiErrorBody(body: unknown): string | null {
  if (!body || typeof body !== "object") {
    return null;
  }

  const record = body as Record<string, unknown>;
  const directMessage = [record.message, record.error, record.detail, record.title].find((value) => typeof value === "string" && value.trim());

  if (typeof directMessage === "string") {
    return directMessage;
  }

  if (Array.isArray(record.errors)) {
    const messages = record.errors
      .map((entry) => {
        if (typeof entry === "string") {
          return entry;
        }

        if (entry && typeof entry === "object") {
          const item = entry as Record<string, unknown>;
          return [item.message, item.defaultMessage, item.field].find((value) => typeof value === "string" && value.trim());
        }

        return null;
      })
      .filter((value): value is string => Boolean(value));

    if (messages.length > 0) {
      return messages.join(" ");
    }
  }

  return null;
}

async function getApiErrorMessage(response: Response | null, fallback: string) {
  if (!response) {
    return `Network error. ${fallback}`;
  }

  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const body = await response.json().catch(() => null);
    return readApiErrorBody(body) ?? fallback;
  }

  const text = await response.text().catch(() => "");
  return text.trim() || fallback;
}

export function MenuCatalogManager({ initialKind = "category" }: { initialKind?: MenuFormState["kind"] }) {
  const [locations, setLocations] = useState<LocationDto[]>([]);
  const [categories, setCategories] = useState<MenuCategoryDto[]>([]);
  const [items, setItems] = useState<MenuItemDto[]>([]);
  const [images, setImages] = useState<MenuItemImageDto[]>([]);
  const [locationOverrides, setLocationOverrides] = useState<LocationMenuOverrideDto[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState("");
  const [locationQuery, setLocationQuery] = useState("");
  const [locationSelectionSource, setLocationSelectionSource] = useState<"stored" | "manual" | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedItemId, setSelectedItemId] = useState("");
  const [form, setForm] = useState<MenuFormState>(emptyCategoryForm());
  const [overrideForm, setOverrideForm] = useState<MenuFormState | null>(null);
  const [isFormVisible, setIsFormVisible] = useState(initialKind !== "category");
  const [expandedCategoryIds, setExpandedCategoryIds] = useState<Record<string, boolean>>({});
  const [status, setStatus] = useState<"loading" | "ready" | "unauthenticated" | "error">("loading");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [overrideSaving, setOverrideSaving] = useState(false);
  const [overrideDeletingId, setOverrideDeletingId] = useState<string | null>(null);
  const [canChangeLocation, setCanChangeLocation] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);

  const locationById = useMemo(() => new Map(locations.map((location) => [location.id, location])), [locations]);
  const categoryById = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories]);
  const overrideByTargetKey = useMemo(
    () =>
      new Map(
        locationOverrides.map((override) => [
          getOverrideKey(override.targetType, override.targetId),
          override,
        ]),
      ),
    [locationOverrides],
  );
  const filteredLocations = useMemo(() => {
    const query = locationQuery.trim().toLowerCase();

    if (!query) {
      return locations.slice(0, 8);
    }

    return locations
      .filter((location) =>
        [location.name, location.locationCode, location.addressLine1, location.city, location.province]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(query)),
      )
      .slice(0, 12);
  }, [locationQuery, locations]);

  const selectedLocation = selectedLocationId ? locationById.get(selectedLocationId) ?? null : null;
  const menuMode = canChangeLocation && !selectedLocationId ? "global" : "location";
  const itemForm = form.kind === "item" ? form : null;
  const categoryForm = form.kind === "category" ? form : null;
  const imageForm = form.kind === "image" ? form : null;
  const itemDialogOpen = form.kind === "item" && isFormVisible;
  const categoryDialogOpen = form.kind === "category" && isFormVisible;
  const imageDialogOpen = form.kind === "image" && isFormVisible;
  const selectedItem = selectedItemId ? items.find((item) => item.id === selectedItemId) ?? null : null;
  const selectedItemOverride = selectedItem?.id ? overrideByTargetKey.get(getOverrideKey("ITEM", selectedItem.id)) ?? null : null;
  const canModifySelectedItemImage = Boolean(selectedItem && (!selectedLocationId || selectedItem.locationId !== null || selectedItemOverride));
  const overrideFormState = overrideForm?.kind === "override" ? overrideForm : null;
  const overrideDialogOpen = Boolean(overrideFormState);

  const tree = useMemo<MenuTreeNode[]>(() => {
    const visibleCategories = categories.filter((category) => category.isDeleted !== true).sort(sortCategory);
    const visibleItems = items.filter((item) => item.isDeleted !== true).sort(sortItem);
    const visibleImages = images.slice().sort(sortImage);
    const imagesByItemId = new Map<string, MenuItemImageDto[]>();

    for (const image of visibleImages) {
      const current = imagesByItemId.get(image.menuItemId) ?? [];
      imagesByItemId.set(image.menuItemId, [...current, image]);
    }

    return visibleCategories.map((category) => ({
      category,
      items: visibleItems
        .filter((item) => item.categoryId === category.id)
        .map((item) => ({
          item,
          images: imagesByItemId.get(item.id ?? "") ?? [],
        })),
    }));
  }, [categories, images, items]);

  const loadCatalog = useCallback(async () => {
    const token = localStorage.getItem("umika_access_token");

    if (!token) {
      setStatus("unauthenticated");
      return;
    }

    setStatus("loading");
    setError(null);

    try {
      const [profileResponse, locationsResponse] = await Promise.all([
        fetch("/api/me/profile", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        }).catch(() => null),
        fetch("/api/manager/locations?page=0&size=300&sort=name,asc", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        }).catch(() => null),
      ]);

      if (!profileResponse?.ok) {
        setStatus(profileResponse?.status === 401 || profileResponse?.status === 403 ? "unauthenticated" : "error");
        setError(await getApiErrorMessage(profileResponse, "Unable to load account profile."));
        return;
      }

      const profile = (await profileResponse.json().catch(() => null)) as CurrentAccountProfile | null;
      const roles = [...(profile?.roles ?? []), profile?.role]
        .filter((role): role is string => Boolean(role))
        .map((role) => role.toUpperCase());
      setCanChangeLocation(roles.some((role) => role === "ROLE_ADMIN" || role === "ADMIN"));

      const failed = [locationsResponse].find((response) => !response?.ok);

      if (failed) {
        setStatus(failed.status === 401 || failed.status === 403 ? "unauthenticated" : "error");
        setError(await getApiErrorMessage(failed, "Unable to load restaurant locations."));
        return;
      }

      const locationsPage = (await locationsResponse!.json()) as SpringPage<LocationDto>;

      setLocations(locationsPage.content ?? []);
      setStatus("ready");
    } catch (loadError) {
      setStatus("error");
      setError(getErrorText(loadError) ?? "Unable to load menu management data.");
    }
  }, []);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  useEffect(() => {
    if (status !== "ready") {
      return;
    }

    if (!canChangeLocation && !selectedLocationId) {
      setCategories([]);
      setItems([]);
      setImages([]);
      return;
    }

    const token = localStorage.getItem("umika_access_token");

    if (!token) {
      setStatus("unauthenticated");
      return;
    }

    const controller = new AbortController();

    async function loadResolvedCatalog() {
      setError(null);

      try {
        const params = new URLSearchParams();

        if (selectedLocationId) {
          params.set("locationId", selectedLocationId);
        }

        const url = params.toString() ? `/api/manager/menu-catalog?${params.toString()}` : "/api/manager/menu-catalog";
        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
          signal: controller.signal,
        }).catch(() => null);

        if (controller.signal.aborted) {
          return;
        }

        if (!response?.ok) {
          setCategories([]);
          setItems([]);
          setImages([]);
          setError(await getApiErrorMessage(response, "Unable to load resolved menu catalog."));
          return;
        }

        const body = (await response.json().catch(() => null)) as unknown;
        const resolved = normalizeResolvedCatalog(body);

        setCategories(resolved.categories);
        setItems(resolved.items);
        setImages(resolved.images);
      } catch (catalogError) {
        if (!controller.signal.aborted) {
          setCategories([]);
          setItems([]);
          setImages([]);
          setError(getErrorText(catalogError) ?? "Unable to load resolved menu catalog.");
        }
      }
    }

    void loadResolvedCatalog();

    return () => {
      controller.abort();
    };
  }, [canChangeLocation, selectedLocationId, status]);

  useEffect(() => {
    if (status !== "ready") {
      return;
    }

    if (!selectedLocationId) {
      setLocationOverrides([]);
      setOverrideForm(null);
      return;
    }

    const token = localStorage.getItem("umika_access_token");

    if (!token) {
      return;
    }

    const controller = new AbortController();

    async function loadScope() {
      setOverrideForm(null);

      try {
        const overridesResponse = await fetch(
          `/api/manager/location-menu-overrides?locationId=${encodeURIComponent(selectedLocationId)}&page=0&size=1000&sort=targetType,asc&sort=sortOrder,asc`,
          {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
            signal: controller.signal,
          },
        ).catch(() => null);

        if (controller.signal.aborted) {
          return;
        }

        if (!overridesResponse?.ok) {
          setError(await getApiErrorMessage(overridesResponse, "Unable to load menu overrides."));
          return;
        }

        const overridesBody = (await overridesResponse.json().catch(() => null)) as unknown;

        setLocationOverrides(normalizeLocationMenuOverrides(overridesBody));
      } catch (scopeError) {
        if (!controller.signal.aborted) {
          setError(getErrorText(scopeError) ?? "Unable to load menu overrides.");
        }
      }
    }

    void loadScope();

    return () => {
      controller.abort();
    };
  }, [selectedLocationId, status]);

  useEffect(() => {
    if (locationSelectionSource !== null || selectedLocationId || locations.length === 0 || canChangeLocation) {
      return;
    }

    const stored = getStoredLocationContext();

    if (!stored.locationId && !stored.locationCode) {
      return;
    }

    const matchedLocation = locations.find(
      (location) => location.id === stored.locationId || location.locationCode === stored.locationCode,
    );

    if (!matchedLocation?.id) {
      return;
    }

    setSelectedLocationId(matchedLocation.id);
    setLocationQuery(matchedLocation.name);
    setLocationSelectionSource("stored");
  }, [canChangeLocation, locationSelectionSource, locations, selectedLocationId]);

  useEffect(() => {
    if (status !== "ready" || selectedLocationId || locations.length === 0 || canChangeLocation) {
      return;
    }

    const stored = getStoredLocationContext();

    if (stored.locationId || stored.locationCode) {
      return;
    }

    const firstActiveLocation = locations.find((location) => location.isActive !== false) ?? locations[0];

    if (firstActiveLocation?.id) {
      setSelectedLocationId(firstActiveLocation.id);
      setLocationQuery(firstActiveLocation.name);
      setLocationSelectionSource("manual");
    }
  }, [canChangeLocation, locations, selectedLocationId, status]);

  useEffect(() => {
    if (!selectedCategoryId && tree.length > 0) {
      setSelectedCategoryId(tree[0].category.id ?? "");
      setSelectedItemId(tree[0].items[0]?.item.id ?? "");
    }
  }, [selectedCategoryId, tree]);

  function selectLocation(location: LocationDto) {
    if (!location.id) {
      return;
    }

    setSelectedLocationId(location.id);
    setLocationQuery(location.name);
    setLocationSelectionSource("manual");
    setMessage(null);
    setError(null);
    setDialogError(null);
    setSelectedCategoryId("");
    setSelectedItemId("");
    setForm(emptyCategoryForm(location.id));
    setIsFormVisible(false);
  }

  function clearLocationSelection() {
    setSelectedLocationId("");
    setLocationSelectionSource("manual");
    setMessage(null);
    setError(null);
    setDialogError(null);
    setSelectedCategoryId("");
    setSelectedItemId("");
    setForm(emptyCategoryForm());
    setIsFormVisible(false);
  }

  function startCreateCategory() {
    setForm(emptyCategoryForm(selectedLocationId));
    setIsFormVisible(true);
    setMessage(null);
    setError(null);
    setDialogError(null);
  }

  function startCreateItem(categoryId = selectedCategoryId) {
    const categoryLocationId = categoryById.get(categoryId)?.locationId;
    const itemLocationId = selectedLocationId || categoryLocationId || "";

    setForm(emptyItemForm(categoryId, itemLocationId));
    setIsFormVisible(true);
    setMessage(null);
    setError(null);
    setDialogError(null);
  }

  function startCreateImage(menuItemId = selectedItemId) {
    setForm(emptyImageForm(menuItemId));
    setIsFormVisible(true);
    setMessage(null);
    setError(null);
    setDialogError(null);
  }

  function editCategory(category: MenuCategoryDto) {
    if (!category.id) {
      return;
    }

    if (selectedLocationId) {
      startOverrideCategory(category);
      return;
    }

    setForm({
      kind: "category",
      id: category.id,
      locationId: category.locationId ?? "",
      name: category.name ?? "",
      description: category.description ?? "",
      sortOrder: String(category.sortOrder ?? 0),
      isActive: category.isActive ?? true,
      isDeleted: category.isDeleted ?? false,
    });
    setSelectedCategoryId(category.id);
    setSelectedItemId("");
    setIsFormVisible(true);
    setMessage(null);
    setError(null);
    setDialogError(null);
  }

  function editItem(item: MenuItemDto) {
    if (!item.id) {
      return;
    }

    if (selectedLocationId) {
      startOverrideItem(item);
      return;
    }

    const categoryLocationId = categoryById.get(item.categoryId ?? "")?.locationId ?? "";
    const itemLocationId = canChangeLocation
      ? item.locationId === undefined
        ? categoryLocationId
        : item.locationId ?? ""
      : selectedLocationId || item.locationId || categoryLocationId;

    setForm({
      kind: "item",
      id: item.id,
      categoryId: item.categoryId ?? selectedCategoryId,
      locationId: itemLocationId,
      name: item.name ?? "",
      description: item.description ?? "",
      price: item.price?.toString() ?? "",
      sku: item.sku ?? "",
      displayOrder: String(item.displayOrder ?? 0),
      isAvailable: item.isAvailable ?? true,
      isActive: item.isActive ?? true,
      isDeleted: item.isDeleted ?? false,
    });
    setSelectedCategoryId(item.categoryId);
    setSelectedItemId(item.id);
    setIsFormVisible(true);
    setMessage(null);
    setError(null);
    setDialogError(null);
  }

  function editImage(image: MenuItemImageDto) {
    if (!image.id) {
      return;
    }

    setForm({
      kind: "image",
      id: image.id,
      menuItemId: image.menuItemId,
      imageUrl: image.imageUrl ?? "",
      imageFile: null,
      fileLabel: "",
      isPrimary: image.isPrimary ?? false,
      sortOrder: String(image.sortOrder ?? 0),
    });
    setSelectedItemId(image.menuItemId);
    setIsFormVisible(true);
    setMessage(null);
    setError(null);
    setDialogError(null);
  }

  function startOverrideCategory(category: MenuCategoryDto) {
    if (!selectedLocationId || !category.id) {
      return;
    }

    const override = overrideByTargetKey.get(getOverrideKey("CATEGORY", category.id)) ?? null;

    setOverrideForm(
      emptyOverrideForm({
        locationId: selectedLocationId,
        targetType: "CATEGORY",
        targetId: category.id,
        targetName: category.name ?? "",
        globalName: category.name ?? "",
        globalDescription: category.description ?? "",
        globalPrice: "",
        override,
      }),
    );
    setMessage(null);
    setError(null);
    setDialogError(null);
  }

  function startOverrideItem(item: MenuItemDto) {
    if (!selectedLocationId || !item.id) {
      return;
    }

    const override = overrideByTargetKey.get(getOverrideKey("ITEM", item.id)) ?? null;

    setOverrideForm(
      emptyOverrideForm({
        locationId: selectedLocationId,
        targetType: "ITEM",
        targetId: item.id,
        targetName: item.name ?? "",
        globalName: item.name ?? "",
        globalDescription: item.description ?? "",
        globalPrice: item.price?.toString() ?? "",
        override,
      }),
    );
    setMessage(null);
    setError(null);
    setDialogError(null);
  }

  function toggleCategoryExpansion(categoryId: string | null) {
    if (!categoryId) {
      return;
    }

    setExpandedCategoryIds((current) => ({
      ...current,
      [categoryId]: !current[categoryId],
    }));
  }

  function closeForm() {
    setIsFormVisible(false);
    setMessage(null);
    setError(null);
    setDialogError(null);
  }

  function closeOverrideForm() {
    setOverrideForm(null);
    setMessage(null);
    setError(null);
    setDialogError(null);
  }

  async function saveForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const token = localStorage.getItem("umika_access_token");

    if (!token) {
      setStatus("unauthenticated");
      return;
    }

    setSaving(true);
    setMessage(null);
    setError(null);
    setDialogError(null);

    try {
      if (form.kind === "image" && form.imageFile) {
        const uploadFormData = new FormData();
        uploadFormData.set("menuItemId", form.menuItemId);
        uploadFormData.set("file", form.imageFile);

        if (selectedLocationId) {
          uploadFormData.set("locationId", selectedLocationId);
        } else {
          uploadFormData.set("isPrimary", String(form.isPrimary));
          uploadFormData.set("sortOrder", form.sortOrder.trim() || "0");
        }

        const uploadResponse = await fetch(selectedLocationId ? "/api/manager/location-menu-overrides/item-image" : "/api/manager/menu-item-images/upload", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: uploadFormData,
          cache: "no-store",
        }).catch(() => null);

        if (!uploadResponse?.ok) {
          setDialogError(await getApiErrorMessage(uploadResponse, "Unable to upload menu image."));
          return;
        }

        if (form.id && !selectedLocationId) {
          const deleteResponse = await fetch(`/api/manager/menu-item-images/${form.id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
          }).catch(() => null);

          if (!deleteResponse?.ok) {
            setDialogError(await getApiErrorMessage(deleteResponse, "Image uploaded, but the old image could not be removed."));
            return;
          }
        }

        setMessage(selectedLocationId ? "Override image uploaded." : form.id ? "Menu image replaced." : "Menu image uploaded.");
        closeForm();
        await loadCatalog();
        return;
      }

      const payload = buildPayload(form, canChangeLocation ? null : selectedLocationId || null);
      const endpoint = getEntityEndpoint(form.kind, form.id);

      const response = await fetch(endpoint, {
        method: form.id ? "PUT" : "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        cache: "no-store",
      }).catch(() => null);

      if (!response?.ok) {
        setDialogError(await getApiErrorMessage(response, `Unable to save ${form.kind}.`));
        return;
      }

      setMessage(form.id ? `${capitalize(form.kind)} updated.` : `${capitalize(form.kind)} created.`);
      closeForm();
      await loadCatalog();
    } catch (saveError) {
      setDialogError(getErrorText(saveError) ?? `Unable to save ${form.kind}.`);
    } finally {
      setSaving(false);
    }
  }

  async function saveOverrideForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!overrideForm || overrideForm.kind !== "override") {
      return;
    }

    const token = localStorage.getItem("umika_access_token");

    if (!token) {
      setStatus("unauthenticated");
      return;
    }

    setOverrideSaving(true);
    setMessage(null);
    setError(null);
    setDialogError(null);

    try {
      const payload = buildOverridePayload(overrideForm);
      const endpoint = overrideForm.id ? `/api/manager/location-menu-overrides/${overrideForm.id}` : "/api/manager/location-menu-overrides/by-target";

      const response = await fetch(endpoint, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        cache: "no-store",
      }).catch(() => null);

      if (!response?.ok) {
        setDialogError(await getApiErrorMessage(response, "Unable to save location override."));
        return;
      }

      if (overrideForm.targetType === "ITEM" && overrideForm.customImageFile) {
        const uploadFormData = new FormData();
        uploadFormData.set("locationId", overrideForm.locationId);
        uploadFormData.set("menuItemId", overrideForm.targetId);
        uploadFormData.set("file", overrideForm.customImageFile);

        const uploadResponse = await fetch("/api/manager/location-menu-overrides/item-image", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: uploadFormData,
          cache: "no-store",
        }).catch(() => null);

        if (!uploadResponse?.ok) {
          setDialogError(await getApiErrorMessage(uploadResponse, "Override saved, but the image upload failed."));
          return;
        }
      }

      setMessage(overrideForm.id ? "Location override updated." : "Location override created.");
      closeOverrideForm();
      await loadCatalog();
    } catch (saveError) {
      setDialogError(getErrorText(saveError) ?? "Unable to save location override.");
    } finally {
      setOverrideSaving(false);
    }
  }

  async function deleteEntity(kind: MenuFormState["kind"], id: string, label: string) {
    const token = localStorage.getItem("umika_access_token");

    if (!token) {
      setStatus("unauthenticated");
      return;
    }

    const confirmed = window.confirm(`Delete ${label}?`);

    if (!confirmed) {
      return;
    }

    setDeletingId(id);
    setMessage(null);
    setError(null);
    setDialogError(null);

    if (kind === "override") {
      setOverrideDeletingId(id);
    }

    try {
      const response = await fetch(getDeleteEndpoint(kind, id), {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      }).catch(() => null);

      if (!response?.ok) {
        const message = await getApiErrorMessage(response, `Unable to delete ${kind}.`);
        if (kind === "override" && overrideForm) {
          setDialogError(message);
        } else {
          setError(message);
        }
        return;
      }

      setMessage(`${capitalize(kind)} deleted.`);

      if (form.id === id) {
        closeForm();
      }

      await loadCatalog();
    } catch (deleteError) {
      const message = getErrorText(deleteError) ?? `Unable to delete ${kind}.`;
      if (kind === "override" && overrideForm) {
        setDialogError(message);
      } else {
        setError(message);
      }
    } finally {
      setDeletingId(null);
      setOverrideDeletingId(null);
    }
  }

  async function deleteImage(image: MenuItemImageDto, itemName: string) {
    if (!image.id) {
      return;
    }

    await deleteEntity("image", image.id, `image for ${itemName}`);
  }

  const selectedCategoryOptions = useMemo(
    () =>
      categories.filter((category) => {
        if (category.isDeleted === true) {
          return false;
        }

        if (menuMode === "global") {
          return category.locationId === null;
        }

        return category.locationId === null || category.locationId === selectedLocationId;
      }),
    [categories, menuMode, selectedLocationId],
  );

  const selectedItemOptions = useMemo(
    () =>
      items.filter((item) => {
        if (item.isDeleted === true) {
          return false;
        }

        const category = categoryById.get(item.categoryId);
        const categoryLocationId = category?.locationId ?? null;

        if (menuMode === "global") {
          return item.locationId === null && categoryLocationId === null;
        }

        const itemMatchesSelectedLocation = item.locationId === null || item.locationId === selectedLocationId;

        return itemMatchesSelectedLocation && (categoryLocationId === null || categoryLocationId === selectedLocationId || item.locationId === null);
      }),
    [categoryById, items, menuMode, selectedLocationId],
  );

  return (
    <div className="space-y-6">
      <Card className="rounded-md shadow-none">
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-widest text-primary">
                {menuMode === "global" ? "Global menu" : "Current location"}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {canChangeLocation
                  ? selectedLocation
                    ? `Admins are viewing ${selectedLocation.name}. Switch back to global anytime.`
                    : "Admins start in global menu mode and can switch to a store when needed."
                  : "You are managing the menu for your assigned location only."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => void loadCatalog()}>
                <RefreshCw className="h-4 w-4" />
                Reload
              </Button>
              {canChangeLocation && selectedLocationId ? (
                <Button type="button" variant="outline" onClick={clearLocationSelection}>
                  <X className="h-4 w-4" />
                  Global menu
                </Button>
              ) : null}
              <Button type="button" onClick={startCreateCategory} disabled={!canChangeLocation || Boolean(selectedLocationId)}>
                <Plus className="h-4 w-4" />
                Add category
              </Button>
              <Button type="button" variant="outline" onClick={() => startCreateItem()} disabled={!canChangeLocation || Boolean(selectedLocationId) || !selectedCategoryId}>
                <Plus className="h-4 w-4" />
                Add item
              </Button>
              <Button type="button" variant="outline" onClick={() => startCreateImage()} disabled={!canModifySelectedItemImage}>
                <ImagePlus className="h-4 w-4" />
                Add image
              </Button>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
            <div className="space-y-3">
              <label className="block text-xs font-semibold uppercase tracking-widest text-slate-500">Search locations</label>
              <input
                className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none ring-0 transition-colors focus:border-primary"
                placeholder="Search by name, code, city, or address"
                value={locationQuery}
                onChange={(event) => setLocationQuery(event.target.value)}
              />
              <div className="flex flex-wrap gap-2">
                {filteredLocations.map((location) => (
                  <Button
                    key={location.id}
                    type="button"
                    variant={selectedLocationId === location.id ? "default" : "outline"}
                    className="justify-start"
                    onClick={() => selectLocation(location)}
                    disabled={!canChangeLocation}
                  >
                    <Store className="h-4 w-4" />
                    <span className="truncate">{location.name}</span>
                  </Button>
                ))}
              </div>
            </div>

            <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
              {selectedLocation ? (
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-950">{selectedLocation.name}</p>
                  <p className="truncate text-xs text-slate-500">{selectedLocation.locationCode ?? selectedLocation.id}</p>
                  <p className="text-xs text-slate-500">
                    {[selectedLocation.addressLine1, selectedLocation.city, selectedLocation.province].filter(Boolean).join(" / ")}
                  </p>
                </div>
              ) : canChangeLocation ? (
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-950">Global menu</p>
                  <p className="text-xs text-slate-500">No store selected. Global records are editable here.</p>
                </div>
              ) : (
                <p className="text-sm text-slate-500">No store selected yet.</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {itemForm ? (
        <Dialog
          open={itemDialogOpen}
          onOpenChange={(open) => {
            if (!open) {
              closeForm();
            } else {
              setIsFormVisible(true);
            }
          }}
        >
          <DialogContent className="w-[min(96vw,64rem)]">
            <form className="grid gap-4 p-5 lg:grid-cols-2" onSubmit={saveForm}>
              <DialogHeader className="lg:col-span-2">
                <DialogTitle>{itemForm.id ? "Edit menu item" : "Add menu item"}</DialogTitle>
                <DialogDescription>
                  {menuMode === "global"
                    ? "Editing the global base menu."
                    : selectedLocation
                      ? `Editing the menu for ${selectedLocation.name}.`
                      : "Select a location before editing a menu item."}
                </DialogDescription>
              </DialogHeader>
              <DialogErrorAlert message={dialogError} />

              <Field label="Store">
                <select
                  className={inputClass}
                  value={canChangeLocation ? itemForm.locationId : selectedLocationId || itemForm.locationId}
                  onChange={(event) => setForm({ ...itemForm, locationId: event.target.value })}
                  disabled={!canChangeLocation}
                >
                  <option value="">{canChangeLocation && !selectedLocationId ? "Global menu" : "Current location"}</option>
                  {locations.map((location) => (
                    <option key={location.id} value={location.id ?? ""}>
                      {location.name}
                    </option>
                  ))}
              </select>
            </Field>
            <Field label="Category">
              <select
                className={inputClass}
                value={itemForm.categoryId}
                onChange={(event) => setForm({ ...itemForm, categoryId: event.target.value })}
                required
              >
                <option value="">Select a category</option>
                {selectedCategoryOptions.map((category) => (
                  <option key={category.id} value={category.id ?? ""}>
                    {category.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Item name">
              <input
                className={inputClass}
                value={itemForm.name}
                onChange={(event) => setForm({ ...itemForm, name: event.target.value })}
                required
              />
            </Field>
            <Field label="Price">
              <input
                className={inputClass}
                inputMode="decimal"
                type="text"
                value={itemForm.price}
                onChange={(event) => setForm({ ...itemForm, price: event.target.value })}
                required
              />
            </Field>
            <Field label="SKU">
              <input className={inputClass} value={itemForm.sku} onChange={(event) => setForm({ ...itemForm, sku: event.target.value })} />
            </Field>
            <Field label="Display order">
              <input
                className={inputClass}
                type="number"
                value={itemForm.displayOrder}
                onChange={(event) => setForm({ ...itemForm, displayOrder: event.target.value })}
              />
            </Field>
            <Field label="Description" className="lg:col-span-2">
              <textarea
                className={inputClass}
                rows={3}
                value={itemForm.description}
                onChange={(event) => setForm({ ...itemForm, description: event.target.value })}
              />
            </Field>
            <Field label="Availability">
              <label className="flex items-center gap-3 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm">
                <input
                  checked={itemForm.isAvailable}
                  type="checkbox"
                  onChange={(event) => setForm({ ...itemForm, isAvailable: event.target.checked })}
                />
                Available for ordering
              </label>
            </Field>
            <Field label="Active">
              <label className="flex items-center gap-3 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm">
                <input
                  checked={itemForm.isActive}
                  type="checkbox"
                  onChange={(event) => setForm({ ...itemForm, isActive: event.target.checked })}
                />
                Visible in the menu
              </label>
            </Field>

            <DialogFooter className="lg:col-span-2">
              <Button type="submit" disabled={saving}>
                <Plus className="h-4 w-4" />
                {saving ? "Saving..." : itemForm.id ? "Update" : "Create"}
              </Button>
              <Button type="button" variant="outline" onClick={closeForm}>
                <X className="h-4 w-4" />
                Cancel
              </Button>
            </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      ) : null}

      {categoryForm ? (
        <Dialog
          open={categoryDialogOpen}
          onOpenChange={(open) => {
            if (!open) {
              closeForm();
            } else {
              setIsFormVisible(true);
            }
          }}
        >
          <DialogContent className="w-[min(96vw,64rem)]">
            <form className="grid gap-4 p-5 lg:grid-cols-2" onSubmit={saveForm}>
              <DialogHeader className="lg:col-span-2">
                <DialogTitle>{categoryForm.id ? "Edit category" : "Add category"}</DialogTitle>
                <DialogDescription>
                  {menuMode === "global"
                    ? "Editing the global base menu."
                    : selectedLocation
                      ? `Editing the menu for ${selectedLocation.name}.`
                      : "Select a location before editing a category."}
                </DialogDescription>
              </DialogHeader>
              <DialogErrorAlert message={dialogError} />
              <Field label="Store">
                <select
                  className={inputClass}
                  value={canChangeLocation ? categoryForm.locationId : selectedLocationId || categoryForm.locationId}
                  onChange={(event) => setForm({ ...categoryForm, locationId: event.target.value })}
                  disabled={!canChangeLocation}
                >
                  <option value="">{canChangeLocation && !selectedLocationId ? "Global menu" : "Current location"}</option>
                  {locations.map((location) => (
                    <option key={location.id} value={location.id ?? ""}>
                      {location.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Category name">
                <input
                  className={inputClass}
                  value={categoryForm.name}
                  onChange={(event) => setForm({ ...categoryForm, name: event.target.value })}
                  required
                />
              </Field>
              <Field label="Description" className="lg:col-span-2">
                <textarea
                  className={inputClass}
                  rows={3}
                  value={categoryForm.description}
                  onChange={(event) => setForm({ ...categoryForm, description: event.target.value })}
                />
              </Field>
              <Field label="Sort order">
                <input
                  className={inputClass}
                  type="number"
                  value={categoryForm.sortOrder}
                  onChange={(event) => setForm({ ...categoryForm, sortOrder: event.target.value })}
                />
              </Field>
              <Field label="Active">
                <label className="flex items-center gap-3 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm">
                  <input
                    checked={categoryForm.isActive}
                    type="checkbox"
                    onChange={(event) => setForm({ ...categoryForm, isActive: event.target.checked })}
                  />
                  Visible to staff and customers
                </label>
              </Field>
              <DialogFooter className="lg:col-span-2">
                <Button type="submit" disabled={saving}>
                  <Plus className="h-4 w-4" />
                  {saving ? "Saving..." : categoryForm.id ? "Update" : "Create"}
                </Button>
                <Button type="button" variant="outline" onClick={closeForm}>
                  <X className="h-4 w-4" />
                  Cancel
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      ) : null}

      {imageForm ? (
        <Dialog
          open={imageDialogOpen}
          onOpenChange={(open) => {
            if (!open) {
              closeForm();
            } else {
              setIsFormVisible(true);
            }
          }}
        >
          <DialogContent className="w-[min(96vw,64rem)]">
            <form className="grid gap-4 p-5 lg:grid-cols-2" onSubmit={saveForm}>
              <DialogHeader className="lg:col-span-2">
                <DialogTitle>{imageForm.id ? "Edit image" : "Add image"}</DialogTitle>
                <DialogDescription>
                  {selectedLocation
                    ? `Editing the menu images for ${selectedLocation.name}.`
                    : "Select a location before adding menu images."}
                </DialogDescription>
              </DialogHeader>
              <DialogErrorAlert message={dialogError} />
              <Field label="Menu item">
                <select
                  className={inputClass}
                  value={imageForm.menuItemId}
                  onChange={(event) => setForm({ ...imageForm, menuItemId: event.target.value })}
                  required
                >
                  <option value="">Select a menu item</option>
                  {selectedItemOptions.map((item) => (
                    <option key={item.id} value={item.id ?? ""}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Upload image" className="lg:col-span-2">
                <input
                  accept="image/*"
                  className={inputClass}
                  type="file"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    setForm((current) =>
                      current.kind === "image"
                        ? {
                            ...current,
                            imageFile: file,
                            fileLabel: file?.name ?? "",
                          }
                        : current,
                    );
                  }}
                />
                <p className="text-xs text-slate-500">
                  {imageForm.id ? "Choose a new file to replace the current image, or leave it empty to keep metadata only." : "Choose an image file to upload."}
                </p>
                {imageForm.fileLabel ? <p className="text-xs font-medium text-slate-700">Selected: {imageForm.fileLabel}</p> : null}
                {imageForm.id && imageForm.imageUrl ? <p className="break-all text-xs text-slate-500">Current URL: {imageForm.imageUrl}</p> : null}
              </Field>
              <Field label="Sort order">
                <input
                  className={inputClass}
                  type="number"
                  value={imageForm.sortOrder}
                  onChange={(event) => setForm({ ...imageForm, sortOrder: event.target.value })}
                />
              </Field>
              <Field label="Primary">
                <label className="flex items-center gap-3 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm">
                  <input
                    checked={imageForm.isPrimary}
                    type="checkbox"
                    onChange={(event) =>
                      setForm((current) => (current.kind === "image" ? { ...current, isPrimary: event.target.checked } : current))
                    }
                  />
                  Primary image
                </label>
              </Field>
              <DialogFooter className="lg:col-span-2">
                <Button type="submit" disabled={saving}>
                  <Plus className="h-4 w-4" />
                  {saving ? "Saving..." : imageForm.id ? "Update" : "Create"}
                </Button>
                <Button type="button" variant="outline" onClick={closeForm}>
                  <X className="h-4 w-4" />
                  Cancel
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      ) : null}

      {overrideFormState ? (
        <Dialog
          open={overrideDialogOpen}
          onOpenChange={(open) => {
            if (!open) {
              closeOverrideForm();
            }
          }}
        >
          <DialogContent className="w-[min(96vw,64rem)]">
            <form className="grid gap-4 p-5 lg:grid-cols-2" onSubmit={saveOverrideForm}>
              <DialogHeader className="lg:col-span-2">
                <DialogTitle>{overrideFormState.id ? "Edit override" : "Add override"}</DialogTitle>
                <DialogDescription>
                  {selectedLocation ? `Editing store-specific values for ${selectedLocation.name}.` : "Select a store before editing overrides."}
                </DialogDescription>
              </DialogHeader>
              <DialogErrorAlert message={dialogError} />
              <Field label="Target">
                <input className={inputClass} value={overrideFormState.targetName} readOnly />
              </Field>
              <Field label="Type">
                <input className={inputClass} value={overrideFormState.targetType} readOnly />
              </Field>
              <Field label="Store">
                <input className={inputClass} value={selectedLocation?.name ?? ""} readOnly disabled />
              </Field>
              <Field label="Visible">
                <label className="flex items-center gap-3 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm">
                  <input
                    checked={overrideFormState.isVisible}
                    type="checkbox"
                    onChange={(event) => setOverrideForm({ ...overrideFormState, isVisible: event.target.checked })}
                  />
                  Show this record for the selected store
                </label>
              </Field>
              <Field label="Global value" className="lg:col-span-2">
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs">
                    <p className="font-semibold uppercase tracking-widest text-slate-500">Name</p>
                    <p className="mt-2 text-sm text-slate-900">{overrideFormState.globalName || "No global name"}</p>
                  </div>
                  <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs">
                    <p className="font-semibold uppercase tracking-widest text-slate-500">Description</p>
                    <p className="mt-2 text-sm text-slate-900">{overrideFormState.globalDescription || "No global description"}</p>
                  </div>
                  <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs">
                    <p className="font-semibold uppercase tracking-widest text-slate-500">Price</p>
                    <p className="mt-2 text-sm text-slate-900">{overrideFormState.globalPrice || "No global price"}</p>
                  </div>
                </div>
              </Field>
              <Field label="Override name">
                <input
                  className={inputClass}
                  value={overrideFormState.customName}
                  onChange={(event) => setOverrideForm({ ...overrideFormState, customName: event.target.value })}
                  placeholder="Leave blank to inherit"
                />
              </Field>
              <Field label="Override sort order">
                <input
                  className={inputClass}
                  type="number"
                  value={overrideFormState.sortOrder}
                  onChange={(event) => setOverrideForm({ ...overrideFormState, sortOrder: event.target.value })}
                />
              </Field>
              <Field label="Override description" className="lg:col-span-2">
                <textarea
                  className={inputClass}
                  rows={3}
                  value={overrideFormState.customDescription}
                  onChange={(event) => setOverrideForm({ ...overrideFormState, customDescription: event.target.value })}
                  placeholder="Leave blank to inherit"
                />
              </Field>
              {overrideFormState.targetType === "ITEM" ? (
                <>
                  <Field label="Override price">
                    <input
                      className={inputClass}
                      inputMode="decimal"
                      type="text"
                      value={overrideFormState.customPrice}
                      onChange={(event) => setOverrideForm({ ...overrideFormState, customPrice: event.target.value })}
                      placeholder="Leave blank to inherit"
                    />
                  </Field>
                  <Field label="Override image">
                    <input
                      accept="image/*"
                      className={inputClass}
                      type="file"
                      onChange={(event) => {
                        const file = event.target.files?.[0] ?? null;
                        setOverrideForm({
                          ...overrideFormState,
                          customImageFile: file,
                          customImageFileLabel: file?.name ?? "",
                        });
                      }}
                    />
                    <p className="text-xs text-slate-500">Upload a store-specific image. Leave empty to keep the current inherited image.</p>
                    {overrideFormState.customImageFileLabel ? (
                      <p className="text-xs font-medium text-slate-700">Selected: {overrideFormState.customImageFileLabel}</p>
                    ) : null}
                    {overrideFormState.customImageUrl ? (
                      <p className="break-all text-xs text-slate-500">Current override image: {overrideFormState.customImageUrl}</p>
                    ) : null}
                  </Field>
                </>
              ) : null}
              <div className="flex flex-wrap gap-2 lg:col-span-2">
                <Button type="submit" disabled={overrideSaving}>
                  <ShieldCheck className="h-4 w-4" />
                  {overrideSaving ? "Saving..." : overrideFormState.id ? "Update override" : "Create override"}
                </Button>
                <Button type="button" variant="outline" onClick={closeOverrideForm}>
                  <X className="h-4 w-4" />
                  Cancel
                </Button>
                {overrideFormState.id ? (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={overrideDeletingId === overrideFormState.id}
                    onClick={() => void deleteEntity("override", overrideFormState.id, `${overrideFormState.targetType.toLowerCase()} override`)}
                  >
                    <Trash2 className="h-4 w-4" />
                    Remove override
                  </Button>
                ) : null}
              </div>
            </form>
          </DialogContent>
        </Dialog>
      ) : null}

      <Card className="rounded-md shadow-none">
        <CardHeader className="pb-3">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <div>
              <CardTitle className="text-base">Menu tree</CardTitle>
              <p className="mt-2 text-sm text-slate-500">
                Categories are the root, items sit underneath, and each item can hold multiple images.
              </p>
            </div>
            <Badge className="border-slate-200 bg-slate-100 text-slate-700">
              {selectedLocation ? `${tree.length} categories` : canChangeLocation ? "Global menu" : "No store selected"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === "loading" ? (
            <div className="rounded-md border border-slate-200 p-5 text-sm text-slate-500">Loading restaurant menu...</div>
          ) : status === "unauthenticated" ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-5">
              <p className="font-semibold text-amber-900">Sign in required</p>
              <p className="mt-1 text-sm text-amber-800">Log in with a manager or admin account to manage restaurant menus.</p>
              <div className="mt-4">
                <LoginRedirectLink className="text-sm font-semibold text-amber-900 underline underline-offset-4">Log in</LoginRedirectLink>
              </div>
            </div>
          ) : error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-5 text-sm text-destructive">
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            </div>
          ) : !selectedLocation && !canChangeLocation ? (
            <div className="rounded-md border border-slate-200 p-5 text-sm text-slate-500">
              Select a location to start managing its menu tree.
            </div>
          ) : tree.length === 0 ? (
            <div className="rounded-md border border-slate-200 p-5 text-sm text-slate-500">
              {menuMode === "global"
                ? "No global categories yet. Add the first category above."
                : "No categories yet for this store. Add the first category above."}
            </div>
          ) : (
            <div className="space-y-4">
              {message ? (
                <div className="flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{message}</span>
                </div>
              ) : null}
              {tree.map((node) => (
                <div key={node.category.id} className="rounded-md border border-slate-200">
                  <div
                    className="flex w-full items-start justify-between gap-3 border-b border-slate-200 p-4 text-left"
                    onClick={() => toggleCategoryExpansion(node.category.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        toggleCategoryExpansion(node.category.id);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    aria-expanded={Boolean(expandedCategoryIds[node.category.id ?? ""])}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <ChevronRight
                          className={cn(
                            "h-4 w-4 shrink-0 text-slate-400 transition-transform",
                            expandedCategoryIds[node.category.id ?? ""] ? "rotate-90" : "rotate-0",
                          )}
                        />
                        <SquareStack className="h-4 w-4 shrink-0 text-primary" />
                        <p className="truncate text-sm font-semibold text-slate-950">{node.category.name}</p>
                        {selectedCategoryId === node.category.id ? <Badge>selected</Badge> : null}
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {[node.category.sortOrder ?? 0, node.category.isActive === false ? "hidden" : "visible"]
                          .map(String)
                          .join(" / ")}
                      </p>
                      {node.category.description ? <p className="mt-2 text-sm text-slate-600">{node.category.description}</p> : null}
                      <div className="mt-2 flex flex-wrap gap-2">{categoryScopeBadge(node.category.locationId)}</div>
                    </div>
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        onClick={(event) => {
                          event.stopPropagation();
                          editCategory(node.category);
                        }}
                        aria-label={node.category.locationId === null && selectedLocationId ? `Override ${node.category.name}` : `Edit ${node.category.name}`}
                      >
                        {node.category.locationId === null && selectedLocationId ? <ShieldCheck className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
                      </Button>
                      {!selectedLocationId ? (
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          onClick={(event) => {
                            event.stopPropagation();
                            startCreateItem(node.category.id ?? selectedCategoryId);
                          }}
                          aria-label={`Add item under ${node.category.name}`}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      ) : null}
                      {node.category.locationId !== null || !selectedLocationId ? (
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          disabled={deletingId === node.category.id}
                          onClick={(event) => {
                            event.stopPropagation();
                            void deleteEntity("category", node.category.id ?? "", node.category.name);
                          }}
                          aria-label={`Delete ${node.category.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  {expandedCategoryIds[node.category.id ?? ""] ? (
                    <div className="divide-y divide-slate-200">
                      {node.items.map(({ item, images: itemImages }) => {
                        const itemOverride = overrideByTargetKey.get(getOverrideKey("ITEM", item.id ?? "")) ?? null;
                        const canModifyImages = !selectedLocationId || item.locationId !== null || Boolean(itemOverride);

                        return (
                          <div key={item.id} className="space-y-3 p-4">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                                  <p className="truncate font-medium text-slate-950">{item.name}</p>
                                  {item.isAvailable === false ? (
                                    <Badge className="border-slate-200 bg-slate-100 text-slate-700">Unavailable</Badge>
                                  ) : (
                                    <Badge>Available</Badge>
                                  )}
                                </div>
                                <p className="mt-1 text-xs text-slate-500">
                                  {currencyFormatter.format(Number(item.price ?? 0))} / {item.sku || "no sku"}
                                </p>
                                {item.description ? <p className="mt-2 text-sm text-slate-600">{item.description}</p> : null}
                                <div className="mt-2 flex flex-wrap gap-2">{itemScopeBadge(item.locationId)}</div>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="outline"
                                  onClick={() => editItem(item)}
                                  aria-label={item.locationId === null && selectedLocationId ? `Override ${item.name}` : `Edit ${item.name}`}
                                >
                                  {item.locationId === null && selectedLocationId ? <ShieldCheck className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
                                </Button>
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="outline"
                                  onClick={() => startCreateImage(item.id ?? selectedItemId)}
                                  aria-label={`Add image for ${item.name}`}
                                  disabled={!canModifyImages}
                                >
                                  <ImagePlus className="h-4 w-4" />
                                </Button>
                                {item.locationId !== null || !selectedLocationId ? (
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="outline"
                                    disabled={deletingId === item.id}
                                    onClick={() => void deleteEntity("item", item.id ?? "", item.name)}
                                    aria-label={`Delete ${item.name}`}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                ) : null}
                              </div>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                              {itemImages.length > 0 ? (
                                itemImages.map((image) => (
                                  <div
                                    key={image.id ?? image.imageUrl}
                                    className={cn(
                                      "group relative overflow-hidden rounded-md border border-slate-200 text-left transition-colors hover:border-primary/40",
                                      selectedItemId === item.id ? "bg-primary/5" : "bg-white",
                                    )}
                                  >
                                    {selectedLocationId && item.locationId === null && !itemOverride ? (
                                      <div className="block w-full text-left">
                                        <div className="aspect-[4/3] w-full bg-slate-100">
                                          <img alt={item.name} className="h-full w-full object-cover" src={resolveBackendMediaUrl(image.imageUrl)} />
                                        </div>
                                        <div className="flex items-center justify-between gap-2 p-3 text-xs text-slate-600">
                                          <span className="truncate font-medium text-slate-950">
                                            {image.isPrimary ? "Primary image" : "Menu image"}
                                          </span>
                                          <span>{image.sortOrder ?? 0}</span>
                                        </div>
                                      </div>
                                    ) : (
                                      <button
                                        type="button"
                                        className="block w-full text-left"
                                        onClick={() => {
                                          if (image.id?.includes(":resolved-image")) {
                                            startCreateImage(item.id ?? selectedItemId);
                                          } else {
                                            editImage(image);
                                          }
                                        }}
                                      >
                                        <div className="aspect-[4/3] w-full bg-slate-100">
                                          <img alt={item.name} className="h-full w-full object-cover" src={resolveBackendMediaUrl(image.imageUrl)} />
                                        </div>
                                        <div className="flex items-center justify-between gap-2 p-3 text-xs text-slate-600">
                                          <span className="truncate font-medium text-slate-950">
                                            {image.isPrimary ? "Primary image" : "Menu image"}
                                          </span>
                                          <span>{image.sortOrder ?? 0}</span>
                                        </div>
                                      </button>
                                    )}
                                    {image.id && !image.id.includes(":resolved-image") && !selectedLocationId ? (
                                      <button
                                        type="button"
                                        className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-md border border-slate-200 bg-white/95 text-slate-600 shadow-sm transition-colors hover:border-destructive hover:text-destructive"
                                        onClick={() => void deleteImage(image, item.name)}
                                        aria-label={`Delete image for ${item.name}`}
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    ) : null}
                                  </div>
                                ))
                              ) : (
                                <div className="rounded-md border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                                  No images yet. Add the first menu photo for this item.
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      {node.items.length === 0 ? (
                        <div className="p-4 text-sm text-slate-500">No items yet under this category.</div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function buildPayload(form: MenuFormState, forcedLocationId: string | null = null) {
  if (form.kind === "category") {
    return {
      locationId: (forcedLocationId ?? form.locationId) || null,
      name: form.name.trim(),
      description: form.description.trim() || null,
      sortOrder: form.sortOrder.trim() ? Number(form.sortOrder) : null,
      isActive: form.isActive,
      isDeleted: form.isDeleted,
    };
  }

  if (form.kind === "item") {
    return {
      categoryId: form.categoryId,
      locationId: (forcedLocationId ?? form.locationId) || null,
      name: form.name.trim(),
      description: form.description.trim() || null,
      price: form.price.trim(),
      sku: form.sku.trim() || null,
      displayOrder: form.displayOrder.trim() ? Number(form.displayOrder) : null,
      isAvailable: form.isAvailable,
      isActive: form.isActive,
      isDeleted: form.isDeleted,
    };
  }

  if (form.kind === "override") {
    return buildOverridePayload(form);
  }

  return {
    menuItemId: form.menuItemId,
    imageUrl: form.imageUrl.trim(),
    isPrimary: form.isPrimary,
    sortOrder: form.sortOrder.trim() ? Number(form.sortOrder) : null,
  };
}

function getEntityEndpoint(kind: MenuFormState["kind"], id: string) {
  const base =
    kind === "category"
      ? "/api/manager/menu-categories"
      : kind === "item"
        ? "/api/manager/menu-items"
        : kind === "override"
          ? "/api/manager/location-menu-overrides"
          : "/api/manager/menu-item-images";

  return id ? `${base}/${id}` : base;
}

function getDeleteEndpoint(kind: MenuFormState["kind"], id: string) {
  if (kind === "override") {
    return id ? `/api/manager/location-menu-overrides/${id}` : "/api/manager/location-menu-overrides";
  }

  if (kind === "image") {
    return id ? `/api/manager/menu-item-images/${id}/picture` : "/api/manager/menu-item-images/picture";
  }

  return getEntityEndpoint(kind, id);
}

function sortCategory(a: MenuCategoryDto, b: MenuCategoryDto) {
  const scopeA = a.locationId === null ? 0 : 1;
  const scopeB = b.locationId === null ? 0 : 1;

  return scopeA - scopeB || (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name);
}

function sortItem(a: MenuItemDto, b: MenuItemDto) {
  return (a.displayOrder ?? 0) - (b.displayOrder ?? 0) || a.name.localeCompare(b.name);
}

function sortImage(a: MenuItemImageDto, b: MenuItemImageDto) {
  return (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || (a.createdAt ?? "").localeCompare(b.createdAt ?? "");
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("space-y-2", className)}>
      <span className="block text-xs font-semibold uppercase tracking-widest text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function DialogErrorAlert({ message }: { message: string | null }) {
  if (!message) {
    return null;
  }

  return (
    <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive lg:col-span-2">
      <div className="flex items-start gap-2">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{message}</span>
      </div>
    </div>
  );
}

const inputClass =
  "h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none ring-0 transition-colors placeholder:text-slate-400 focus:border-primary";

function getStoredLocationContext(): MenuLocationContext {
  if (typeof window === "undefined") {
    return { locationId: null, locationCode: null };
  }

  return {
    locationId:
      sessionStorage.getItem("umika_location_id") ??
      localStorage.getItem("umika_location_id") ??
      sessionStorage.getItem("location_id") ??
      localStorage.getItem("location_id"),
    locationCode: sessionStorage.getItem("umika_location_code") ?? localStorage.getItem("umika_location_code"),
  };
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function categoryScopeBadge(locationId: string | null) {
  return locationId === null ? (
    <Badge className="border-slate-200 bg-slate-100 text-slate-700">Global</Badge>
  ) : (
    <Badge className="border-slate-200 bg-emerald-50 text-emerald-700">Location</Badge>
  );
}

function itemScopeBadge(locationId: string | null) {
  return locationId === null ? (
    <Badge className="border-slate-200 bg-slate-100 text-slate-700">Global item</Badge>
  ) : (
    <Badge className="border-slate-200 bg-emerald-50 text-emerald-700">Location item</Badge>
  );
}

function getOverrideKey(targetType: MenuOverrideTargetType, targetId: string) {
  return `${targetType}:${targetId}`;
}

function normalizeLocationMenuOverrides(body: unknown): LocationMenuOverrideDto[] {
  const content = extractContent<LocationMenuOverrideWireDto>(body);

  return content
    .map(normalizeLocationMenuOverride)
    .filter((item): item is LocationMenuOverrideDto => Boolean(item));
}

function extractContent<T>(body: unknown): T[] {
  if (Array.isArray(body)) {
    return body as T[];
  }

  if (body && typeof body === "object") {
    const value = body as Record<string, unknown>;

    if (Array.isArray(value.content)) {
      return value.content as T[];
    }
  }

  return [];
}

function normalizeLocationMenuOverride(override: LocationMenuOverrideWireDto | null | undefined): LocationMenuOverrideDto | null {
  const locationId = override?.locationId ?? override?.location_id ?? "";
  const targetType = (override?.targetType ?? override?.target_type ?? "").toUpperCase() as MenuOverrideTargetType;
  const targetId = override?.targetId ?? override?.target_id ?? "";

  if (!locationId || !targetId || (targetType !== "CATEGORY" && targetType !== "ITEM")) {
    return null;
  }

  return {
    id: override?.id ?? null,
    locationId,
    targetType,
    targetId,
    isVisible: override?.isVisible ?? override?.is_visible ?? null,
    sortOrder: override?.sortOrder ?? override?.sort_order ?? null,
    customName: override?.customName ?? override?.custom_name ?? null,
    customDescription: override?.customDescription ?? override?.custom_description ?? null,
    customPrice: override?.customPrice ?? override?.custom_price ?? null,
    customImageUrl: override?.customImageUrl ?? override?.custom_image_url ?? null,
    createdAt: override?.createdAt ?? null,
    updatedAt: override?.updatedAt ?? null,
  };
}

function normalizeResolvedCatalog(body: unknown): ResolvedCatalogState {
  const categoriesInput = extractCatalogCategories(body);
  const categories: MenuCategoryDto[] = [];
  const items: MenuItemDto[] = [];
  const images: MenuItemImageDto[] = [];

  for (const categoryInput of categoriesInput) {
    if (!categoryInput || typeof categoryInput !== "object") {
      continue;
    }

    const categoryValue = categoryInput as Record<string, unknown>;
    const categoryId = getString(categoryValue.id);

    if (!categoryId) {
      continue;
    }

    categories.push({
      id: categoryId,
      locationId: getString(categoryValue.locationId) ?? getString(categoryValue.location_id),
      name: getString(categoryValue.name) ?? "",
      description: getString(categoryValue.description),
      sortOrder: getNumber(categoryValue.sortOrder) ?? getNumber(categoryValue.sort_order),
      isActive: getBoolean(categoryValue.isActive) ?? getBoolean(categoryValue.isVisible) ?? getBoolean(categoryValue.is_visible),
      isDeleted: false,
      createdAt: getString(categoryValue.createdAt),
      updatedAt: getString(categoryValue.updatedAt),
    });

    const itemInputs = Array.isArray(categoryValue.items) ? categoryValue.items : [];

    for (const itemInput of itemInputs) {
      if (!itemInput || typeof itemInput !== "object") {
        continue;
      }

      const itemValue = itemInput as Record<string, unknown>;
      const itemId = getString(itemValue.id);

      if (!itemId) {
        continue;
      }

      const imageUrl = getString(itemValue.imageUrl) ?? getString(itemValue.image_url);

      items.push({
        id: itemId,
        categoryId: getString(itemValue.categoryId) ?? getString(itemValue.category_id) ?? categoryId,
        locationId: getString(itemValue.locationId) ?? getString(itemValue.location_id),
        name: getString(itemValue.name) ?? "",
        description: getString(itemValue.description),
        price: getString(itemValue.price) ?? getNumber(itemValue.price),
        sku: getString(itemValue.sku),
        displayOrder: getNumber(itemValue.displayOrder) ?? getNumber(itemValue.display_order) ?? getNumber(itemValue.sortOrder) ?? getNumber(itemValue.sort_order),
        isAvailable: getBoolean(itemValue.isAvailable) ?? getBoolean(itemValue.isVisible) ?? getBoolean(itemValue.is_visible),
        isActive: getBoolean(itemValue.isActive) ?? getBoolean(itemValue.isVisible) ?? getBoolean(itemValue.is_visible),
        isDeleted: false,
        createdAt: getString(itemValue.createdAt),
        updatedAt: getString(itemValue.updatedAt),
      });

      if (imageUrl) {
        images.push({
          id: getString(itemValue.imageId) ?? getString(itemValue.image_id) ?? `${itemId}:resolved-image`,
          menuItemId: itemId,
          imageUrl,
          isPrimary: true,
          sortOrder: 0,
          createdAt: null,
        });
      }

      const itemImages = Array.isArray(itemValue.images) ? itemValue.images : [];

      for (const imageInput of itemImages) {
        if (!imageInput || typeof imageInput !== "object") {
          continue;
        }

        const imageValue = imageInput as Record<string, unknown>;
        const nestedImageUrl = getString(imageValue.imageUrl) ?? getString(imageValue.image_url);

        if (!nestedImageUrl || nestedImageUrl === imageUrl) {
          continue;
        }

        images.push({
          id: getString(imageValue.id) ?? `${itemId}:${nestedImageUrl}`,
          menuItemId: itemId,
          imageUrl: nestedImageUrl,
          isPrimary: getBoolean(imageValue.isPrimary) ?? getBoolean(imageValue.is_primary),
          sortOrder: getNumber(imageValue.sortOrder) ?? getNumber(imageValue.sort_order),
          createdAt: getString(imageValue.createdAt),
        });
      }
    }
  }

  return { categories, items, images };
}

function extractCatalogCategories(body: unknown): unknown[] {
  if (Array.isArray(body)) {
    return body;
  }

  if (!body || typeof body !== "object") {
    return [];
  }

  const value = body as Record<string, unknown>;

  if (Array.isArray(value.categories)) {
    return value.categories;
  }

  if (Array.isArray(value.content)) {
    return value.content;
  }

  return [];
}

function getString(value: unknown): string | null {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number") {
    return String(value);
  }

  return null;
}

function getNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function getBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function buildOverridePayload(form: Extract<MenuFormState, { kind: "override" }>) {
  return {
    locationId: form.locationId,
    targetType: form.targetType,
    targetId: form.targetId,
    isVisible: form.isVisible,
    sortOrder: form.sortOrder.trim() ? Number(form.sortOrder) : null,
    customName: form.customName.trim() || null,
    customDescription: form.customDescription.trim() || null,
    customPrice: form.customPrice.trim() || null,
    customImageUrl: form.targetType === "ITEM" ? form.customImageUrl.trim() || null : null,
  };
}
