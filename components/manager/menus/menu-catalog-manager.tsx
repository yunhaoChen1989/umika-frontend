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
  Trash2,
  X,
} from "lucide-react";

import { LoginRedirectLink } from "@/components/auth/login-redirect-link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LocationDto, SpringPage } from "@/lib/location-types";
import type { MenuCategoryDto, MenuItemDto, MenuItemImageDto } from "@/lib/menu-management-types";
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

export function MenuCatalogManager({ initialKind = "category" }: { initialKind?: MenuFormState["kind"] }) {
  const [locations, setLocations] = useState<LocationDto[]>([]);
  const [categories, setCategories] = useState<MenuCategoryDto[]>([]);
  const [items, setItems] = useState<MenuItemDto[]>([]);
  const [images, setImages] = useState<MenuItemImageDto[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState("");
  const [locationQuery, setLocationQuery] = useState("");
  const [locationSelectionSource, setLocationSelectionSource] = useState<"stored" | "manual" | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedItemId, setSelectedItemId] = useState("");
  const [form, setForm] = useState<MenuFormState>(emptyCategoryForm());
  const [isFormVisible, setIsFormVisible] = useState(initialKind !== "category");
  const [expandedCategoryIds, setExpandedCategoryIds] = useState<Record<string, boolean>>({});
  const [status, setStatus] = useState<"loading" | "ready" | "unauthenticated" | "error">("loading");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [canChangeLocation, setCanChangeLocation] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const locationById = useMemo(() => new Map(locations.map((location) => [location.id, location])), [locations]);
  const categoryById = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories]);
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

  const tree = useMemo<MenuTreeNode[]>(() => {
    if (!selectedLocationId) {
      return [];
    }

    const visibleCategories = categories
      .filter(
        (category) =>
          category.isDeleted !== true && (category.locationId === selectedLocationId || category.locationId === null),
      )
      .sort(sortCategory);
    const visibleItems = items
      .filter((item) => item.isDeleted !== true)
      .sort(sortItem);
    const visibleImages = images.slice().sort(sortImage);
    const imagesByItemId = new Map<string, MenuItemImageDto[]>();

    for (const image of visibleImages) {
      const current = imagesByItemId.get(image.menuItemId) ?? [];
      imagesByItemId.set(image.menuItemId, [...current, image]);
    }

    return visibleCategories.map((category) => ({
      category,
      items: visibleItems
        .filter((item) => {
          if (item.categoryId !== category.id) {
            return false;
          }

          const itemMatchesSelectedLocation = item.locationId === null || item.locationId === selectedLocationId;

          if (!itemMatchesSelectedLocation) {
            return false;
          }

          if (category.locationId === null) {
            return true;
          }

          return item.locationId === null || item.locationId === category.locationId;
        })
        .map((item) => ({
          item,
          images: imagesByItemId.get(item.id ?? "") ?? [],
        })),
    }));
  }, [categories, images, items, selectedLocationId]);

  const selectedLocation = selectedLocationId ? locationById.get(selectedLocationId) ?? null : null;

  const loadCatalog = useCallback(async () => {
    const token = localStorage.getItem("umika_access_token");

    if (!token) {
      setStatus("unauthenticated");
      return;
    }

    setStatus("loading");
    setError(null);

    const [profileResponse, locationsResponse, categoriesResponse, itemsResponse, imagesResponse] = await Promise.all([
      fetch("/api/me/profile", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      }).catch(() => null),
      fetch("/api/manager/locations?page=0&size=300&sort=name,asc", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      }).catch(() => null),
      fetch("/api/manager/menu-categories?page=0&size=500&sort=sortOrder,asc", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      }).catch(() => null),
      fetch("/api/manager/menu-items?page=0&size=1000&sort=displayOrder,asc", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      }).catch(() => null),
      fetch("/api/manager/menu-item-images?page=0&size=1500&sort=sortOrder,asc", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      }).catch(() => null),
    ]);

    if (!profileResponse?.ok) {
      const body = profileResponse ? await profileResponse.json().catch(() => null) : null;
      setStatus(profileResponse?.status === 401 || profileResponse?.status === 403 ? "unauthenticated" : "error");
      setError(typeof body?.message === "string" ? body.message : "Unable to load account profile.");
      return;
    }

    const profile = (await profileResponse.json().catch(() => null)) as CurrentAccountProfile | null;
    const roles = [...(profile?.roles ?? []), profile?.role]
      .filter((role): role is string => Boolean(role))
      .map((role) => role.toUpperCase());
    setCanChangeLocation(roles.some((role) => role === "ROLE_ADMIN" || role === "ADMIN"));

    const failed = [locationsResponse, categoriesResponse, itemsResponse, imagesResponse].find((response) => !response?.ok);

    if (failed) {
      const body = await failed?.json().catch(() => null);
      setStatus(failed?.status === 401 || failed?.status === 403 ? "unauthenticated" : "error");
      setError(typeof body?.message === "string" ? body.message : "Unable to load restaurant menu data.");
      return;
    }

    const [locationsPage, categoriesPage, itemsPage, imagesPage] = await Promise.all([
      locationsResponse!.json() as Promise<SpringPage<LocationDto>>,
      categoriesResponse!.json() as Promise<SpringPage<MenuCategoryDto>>,
      itemsResponse!.json() as Promise<SpringPage<MenuItemDto>>,
      imagesResponse!.json() as Promise<SpringPage<MenuItemImageDto>>,
    ]);

    setLocations(locationsPage.content ?? []);
    setCategories(categoriesPage.content ?? []);
    setItems(itemsPage.content ?? []);
    setImages(imagesPage.content ?? []);
    setStatus("ready");
  }, []);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  useEffect(() => {
    if (locationSelectionSource !== null || selectedLocationId || locations.length === 0) {
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
  }, [locationSelectionSource, locations, selectedLocationId]);

  useEffect(() => {
    if (status !== "ready" || selectedLocationId || locations.length === 0) {
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
  }, [locations, selectedLocationId, status]);

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
    setSelectedCategoryId("");
    setSelectedItemId("");
    setForm(emptyCategoryForm(location.id));
    setIsFormVisible(false);
  }

  function startCreateCategory() {
    setForm(emptyCategoryForm(selectedLocationId));
    setIsFormVisible(true);
    setMessage(null);
    setError(null);
  }

  function startCreateItem(categoryId = selectedCategoryId) {
    const categoryLocationId = categoryById.get(categoryId)?.locationId;
    const itemLocationId = canChangeLocation
      ? categoryLocationId === undefined
        ? selectedLocationId
        : categoryLocationId ?? ""
      : selectedLocationId || categoryLocationId || "";

    setForm(emptyItemForm(categoryId, itemLocationId));
    setIsFormVisible(true);
    setMessage(null);
    setError(null);
  }

  function startCreateImage(menuItemId = selectedItemId) {
    setForm(emptyImageForm(menuItemId));
    setIsFormVisible(true);
    setMessage(null);
    setError(null);
  }

  function editCategory(category: MenuCategoryDto) {
    if (!category.id) {
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
  }

  function editItem(item: MenuItemDto) {
    if (!item.id) {
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

    if (form.kind === "image" && form.imageFile) {
      const uploadFormData = new FormData();
      uploadFormData.set("menuItemId", form.menuItemId);
      uploadFormData.set("file", form.imageFile);
      uploadFormData.set("isPrimary", String(form.isPrimary));
      uploadFormData.set("sortOrder", form.sortOrder.trim() || "0");

      const uploadResponse = await fetch("/api/manager/menu-item-images/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: uploadFormData,
        cache: "no-store",
      }).catch(() => null);

      if (!uploadResponse?.ok) {
        const body = uploadResponse ? await uploadResponse.json().catch(() => null) : null;
        setSaving(false);
        setError(typeof body?.message === "string" ? body.message : "Unable to upload menu image.");
        return;
      }

      if (form.id) {
        await fetch(`/api/manager/menu-item-images/${form.id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        }).catch(() => null);
      }

      setSaving(false);
      setMessage(form.id ? "Menu image replaced." : "Menu image uploaded.");
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

    setSaving(false);

    if (!response?.ok) {
      const body = response ? await response.json().catch(() => null) : null;
      setError(typeof body?.message === "string" ? body.message : `Unable to save ${form.kind}.`);
      return;
    }

    setMessage(form.id ? `${capitalize(form.kind)} updated.` : `${capitalize(form.kind)} created.`);
    closeForm();
    await loadCatalog();
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

    const response = await fetch(getDeleteEndpoint(kind, id), {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    }).catch(() => null);

    setDeletingId(null);

    if (!response?.ok) {
      const body = response ? await response.json().catch(() => null) : null;
      setError(typeof body?.message === "string" ? body.message : `Unable to delete ${kind}.`);
      return;
    }

    setMessage(`${capitalize(kind)} deleted.`);

    if (form.id === id) {
      closeForm();
    }

    await loadCatalog();
  }

  async function deleteImage(image: MenuItemImageDto, itemName: string) {
    if (!image.id) {
      return;
    }

    await deleteEntity("image", image.id, `image for ${itemName}`);
  }

  const selectedCategoryOptions = useMemo(
    () =>
      categories.filter(
        (category) => category.isDeleted !== true && (category.locationId === null || category.locationId === selectedLocationId),
      ),
    [categories, selectedLocationId],
  );

  const selectedItemOptions = useMemo(
    () =>
      items.filter((item) => {
        if (item.isDeleted === true) {
          return false;
        }

        const category = categoryById.get(item.categoryId);
        const categoryLocationId = category?.locationId ?? null;
        const itemMatchesSelectedLocation = item.locationId === null || item.locationId === selectedLocationId;

        return (
          itemMatchesSelectedLocation &&
          (categoryLocationId === null || categoryLocationId === selectedLocationId || item.locationId === null)
        );
      }),
    [categoryById, items, selectedLocationId],
  );

  return (
    <div className="space-y-6">
      <Card className="rounded-md shadow-none">
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-widest text-primary">Location</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Select a store first, then manage the tree of categories, items, and item images for that location.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => void loadCatalog()}>
                <RefreshCw className="h-4 w-4" />
                Reload
              </Button>
              <Button type="button" onClick={startCreateCategory} disabled={!selectedLocationId}>
                <Plus className="h-4 w-4" />
                Add category
              </Button>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
            <div className="space-y-3">
              <label className="block text-xs font-semibold uppercase tracking-widest text-slate-500">Search stores</label>
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
              ) : (
                <p className="text-sm text-slate-500">No store selected yet.</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-md shadow-none">
        <CardHeader className="pb-3">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <div>
              <CardTitle className="text-base">Editor</CardTitle>
              <p className="mt-2 text-sm text-slate-500">
                {form.kind === "category"
                  ? "Create or edit a menu category."
                  : form.kind === "item"
                    ? "Create or edit a menu item."
                    : "Create or edit a menu image."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => setForm(emptyCategoryForm(selectedLocationId))}>
                Category
              </Button>
              <Button type="button" variant="outline" onClick={() => startCreateItem()} disabled={!selectedLocationId}>
                Item
              </Button>
              <Button type="button" variant="outline" onClick={() => setForm(emptyImageForm(selectedItemId))}>
                Image
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isFormVisible ? (
            <form className="grid gap-4 lg:grid-cols-2" onSubmit={saveForm}>
              {form.kind === "category" ? (
                <>
                  <Field label="Store">
                    <select
                      className={inputClass}
                      value={canChangeLocation ? form.locationId : selectedLocationId || form.locationId}
                      onChange={(event) => setForm({ ...form, locationId: event.target.value })}
                      disabled={!canChangeLocation}
                    >
                      <option value="">Global menu</option>
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
                      value={form.name}
                      onChange={(event) => setForm({ ...form, name: event.target.value })}
                      required
                    />
                  </Field>
                  <Field label="Description" className="lg:col-span-2">
                    <textarea
                      className={inputClass}
                      rows={3}
                      value={form.description}
                      onChange={(event) => setForm({ ...form, description: event.target.value })}
                    />
                  </Field>
                  <Field label="Sort order">
                    <input
                      className={inputClass}
                      type="number"
                      value={form.sortOrder}
                      onChange={(event) => setForm({ ...form, sortOrder: event.target.value })}
                    />
                  </Field>
                  <Field label="Active">
                    <label className="flex items-center gap-3 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm">
                      <input
                        checked={form.isActive}
                        type="checkbox"
                        onChange={(event) => setForm({ ...form, isActive: event.target.checked })}
                      />
                      Visible to staff and customers
                    </label>
                  </Field>
                </>
              ) : form.kind === "item" ? (
                <>
                  <Field label="Store">
                    <select
                      className={inputClass}
                      value={canChangeLocation ? form.locationId : selectedLocationId || form.locationId}
                      onChange={(event) => setForm({ ...form, locationId: event.target.value })}
                      disabled={!canChangeLocation}
                    >
                      <option value="">Global menu</option>
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
                      value={form.categoryId}
                      onChange={(event) => setForm({ ...form, categoryId: event.target.value })}
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
                      value={form.name}
                      onChange={(event) => setForm({ ...form, name: event.target.value })}
                      required
                    />
                  </Field>
                  <Field label="Price">
                    <input
                      className={inputClass}
                      inputMode="decimal"
                      type="text"
                      value={form.price}
                      onChange={(event) => setForm({ ...form, price: event.target.value })}
                      required
                    />
                  </Field>
                  <Field label="SKU">
                    <input
                      className={inputClass}
                      value={form.sku}
                      onChange={(event) => setForm({ ...form, sku: event.target.value })}
                    />
                  </Field>
                  <Field label="Display order">
                    <input
                      className={inputClass}
                      type="number"
                      value={form.displayOrder}
                      onChange={(event) => setForm({ ...form, displayOrder: event.target.value })}
                    />
                  </Field>
                  <Field label="Description" className="lg:col-span-2">
                    <textarea
                      className={inputClass}
                      rows={3}
                      value={form.description}
                      onChange={(event) => setForm({ ...form, description: event.target.value })}
                    />
                  </Field>
                  <Field label="Availability">
                    <label className="flex items-center gap-3 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm">
                      <input
                        checked={form.isAvailable}
                        type="checkbox"
                        onChange={(event) => setForm({ ...form, isAvailable: event.target.checked })}
                      />
                      Available for ordering
                    </label>
                  </Field>
                  <Field label="Active">
                    <label className="flex items-center gap-3 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm">
                      <input
                        checked={form.isActive}
                        type="checkbox"
                        onChange={(event) => setForm({ ...form, isActive: event.target.checked })}
                      />
                      Visible in the menu
                    </label>
                  </Field>
                </>
              ) : (
                <>
                  <Field label="Menu item">
                    <select
                      className={inputClass}
                      value={form.menuItemId}
                      onChange={(event) => setForm({ ...form, menuItemId: event.target.value })}
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
                      {form.id ? "Choose a new file to replace the current image, or leave it empty to keep metadata only." : "Choose an image file to upload."}
                    </p>
                    {form.fileLabel ? <p className="text-xs font-medium text-slate-700">Selected: {form.fileLabel}</p> : null}
                    {form.id && form.imageUrl ? <p className="break-all text-xs text-slate-500">Current URL: {form.imageUrl}</p> : null}
                  </Field>
                  <Field label="Sort order">
                    <input
                      className={inputClass}
                      type="number"
                      value={form.sortOrder}
                      onChange={(event) => setForm({ ...form, sortOrder: event.target.value })}
                    />
                  </Field>
                  <Field label="Primary">
                    <label className="flex items-center gap-3 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm">
                      <input
                        checked={form.isPrimary}
                        type="checkbox"
                        onChange={(event) =>
                          setForm((current) =>
                            current.kind === "image" ? { ...current, isPrimary: event.target.checked } : current,
                          )
                        }
                      />
                      Primary image
                    </label>
                  </Field>
                </>
              )}

              <div className="flex flex-wrap gap-2 lg:col-span-2">
                <Button type="submit" disabled={saving}>
                  <Plus className="h-4 w-4" />
                  {saving ? "Saving..." : form.id ? "Update" : "Create"}
                </Button>
                <Button type="button" variant="outline" onClick={closeForm}>
                  <X className="h-4 w-4" />
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <div className="rounded-md border border-dashed border-slate-300 p-5 text-sm text-slate-500">
              Select a category, item, or image from the tree to edit it.
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-md shadow-none">
        <CardHeader className="pb-3">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <div>
              <CardTitle className="text-base">Menu tree</CardTitle>
              <p className="mt-2 text-sm text-slate-500">
                Categories are the root, items sit underneath, and each item can hold multiple images.
              </p>
            </div>
            {selectedLocation ? <Badge className="border-slate-200 bg-slate-100 text-slate-700">{tree.length} categories</Badge> : null}
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
          ) : !selectedLocation ? (
            <div className="rounded-md border border-slate-200 p-5 text-sm text-slate-500">
              Search and select a store to start managing its menu tree.
            </div>
          ) : tree.length === 0 ? (
            <div className="rounded-md border border-slate-200 p-5 text-sm text-slate-500">
              No categories yet for this store. Add the first category above.
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
                        aria-label={`Edit ${node.category.name}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
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
                    </div>
                  </div>

                  {expandedCategoryIds[node.category.id ?? ""] ? (
                    <div className="divide-y divide-slate-200">
                      {node.items.map(({ item, images: itemImages }) => (
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
                            <Button type="button" size="icon" variant="outline" onClick={() => editItem(item)} aria-label={`Edit ${item.name}`}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              size="icon"
                              variant="outline"
                              onClick={() => startCreateImage(item.id ?? selectedItemId)}
                              aria-label={`Add image for ${item.name}`}
                            >
                              <ImagePlus className="h-4 w-4" />
                            </Button>
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
                          </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                          {itemImages.length > 0 ? (
                            itemImages.map((image) => (
                              <div
                                key={image.id}
                                className={cn(
                                  "group relative overflow-hidden rounded-md border border-slate-200 text-left transition-colors hover:border-primary/40",
                                  selectedItemId === item.id ? "bg-primary/5" : "bg-white",
                                )}
                              >
                                <button
                                  type="button"
                                  className="block w-full text-left"
                                  onClick={() => editImage(image)}
                                >
                                <div className="aspect-[4/3] w-full bg-slate-100">
                                  <img alt={item.name} className="h-full w-full object-cover" src={resolveBackendMediaUrl(image.imageUrl)} />
                                </div>
                                <div className="flex items-center justify-between gap-2 p-3 text-xs text-slate-600">
                                  <span className="truncate font-medium text-slate-950">{image.isPrimary ? "Primary image" : "Menu image"}</span>
                                  <span>{image.sortOrder ?? 0}</span>
                                </div>
                                </button>
                                <button
                                  type="button"
                                  className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-md border border-slate-200 bg-white/95 text-slate-600 shadow-sm transition-colors hover:border-destructive hover:text-destructive"
                                  onClick={() => void deleteImage(image, item.name)}
                                  aria-label={`Delete image for ${item.name}`}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ))
                          ) : (
                            <div className="rounded-md border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                              No images yet. Add the first menu photo for this item.
                            </div>
                          )}
                        </div>
                      </div>
                      ))}
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

function buildPayload(form: MenuFormState, forcedItemLocationId: string | null = null) {
  if (form.kind === "category") {
    return {
      locationId: form.locationId || null,
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
      locationId: (forcedItemLocationId ?? form.locationId) || null,
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
        : "/api/manager/menu-item-images";

  return id ? `${base}/${id}` : base;
}

function getDeleteEndpoint(kind: MenuFormState["kind"], id: string) {
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
  return locationId === null ? <Badge className="border-slate-200 bg-slate-100 text-slate-700">Global</Badge> : null;
}

function itemScopeBadge(locationId: string | null) {
  return locationId === null ? <Badge className="border-slate-200 bg-slate-100 text-slate-700">Global item</Badge> : null;
}
