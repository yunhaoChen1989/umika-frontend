"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent, InputHTMLAttributes } from "react";
import { CheckSquare2, Pencil, Plus, Settings2, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { SpringPage } from "@/lib/location-types";
import type { MenuItemDto, MenuOptionCategoryDto, MenuOptionDto } from "@/lib/menu-management-types";

type CategoryForm = {
  id: string;
  name: string;
  nameZh: string;
  nameKo: string;
  description: string;
  isRequired: boolean;
  minSelect: string;
  maxSelect: string;
  sortOrder: string;
  isActive: boolean;
};

type OptionForm = {
  id: string;
  categoryId: string;
  name: string;
  nameZh: string;
  nameKo: string;
  description: string;
  priceModifier: string;
  sortOrder: string;
  isActive: boolean;
};

const emptyCategory = (): CategoryForm => ({
  id: "", name: "", nameZh: "", nameKo: "", description: "", isRequired: false,
  minSelect: "0", maxSelect: "", sortOrder: "0", isActive: true,
});

const emptyOption = (categoryId = ""): OptionForm => ({
  id: "", categoryId, name: "", nameZh: "", nameKo: "", description: "",
  priceModifier: "0.00", sortOrder: "0", isActive: true,
});

export function MenuOptionManager({
  locationId,
  canChangeLocation,
  menuItems,
}: {
  locationId: string | null;
  canChangeLocation: boolean;
  menuItems: MenuItemDto[];
}) {
  const [categories, setCategories] = useState<MenuOptionCategoryDto[]>([]);
  const [options, setOptions] = useState<MenuOptionDto[]>([]);
  const [categoryForm, setCategoryForm] = useState<CategoryForm | null>(null);
  const [optionForm, setOptionForm] = useState<OptionForm | null>(null);
  const [assignmentItem, setAssignmentItem] = useState<MenuItemDto | null>(null);
  const [assignedCategoryIds, setAssignedCategoryIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const optionsByCategory = useMemo(() => {
    const result = new Map<string, MenuOptionDto[]>();
    for (const option of options) {
      result.set(option.categoryId, [...(result.get(option.categoryId) ?? []), option]);
    }
    return result;
  }, [options]);

  const loadLibrary = useCallback(async () => {
    const token = localStorage.getItem("umika_access_token");
    if (!token || (!canChangeLocation && !locationId)) {
      setLoading(false);
      setCategories([]);
      setOptions([]);
      return;
    }

    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ page: "0", size: "500", sort: "sortOrder,asc" });
    if (locationId) params.set("locationId", locationId);
    const response = await fetch(`/api/manager/menu-option-categories?${params}`, {
      headers: { Authorization: `Bearer ${token}` }, cache: "no-store",
    }).catch(() => null);
    if (!response?.ok) {
      setError(await readError(response, "Unable to load add-on categories."));
      setLoading(false);
      return;
    }

    const page = (await response.json()) as SpringPage<MenuOptionCategoryDto>;
    const nextCategories = page.content ?? [];
    const optionPages = await Promise.all(nextCategories.map(async (category) => {
      if (!category.id) return [];
      const result = await fetch(`/api/manager/menu-options?categoryId=${encodeURIComponent(category.id)}&page=0&size=500&sort=sortOrder,asc`, {
        headers: { Authorization: `Bearer ${token}` }, cache: "no-store",
      }).catch(() => null);
      if (!result?.ok) return [];
      const body = (await result.json()) as SpringPage<MenuOptionDto>;
      return body.content ?? [];
    }));
    setCategories(nextCategories);
    setOptions(optionPages.flat());
    setLoading(false);
  }, [canChangeLocation, locationId]);

  useEffect(() => { void loadLibrary(); }, [loadLibrary]);

  async function saveCategory(event: FormEvent) {
    event.preventDefault();
    if (!categoryForm) return;
    const token = localStorage.getItem("umika_access_token");
    if (!token) return;
    setSaving(true);
    setError(null);
    const response = await fetch(`/api/manager/menu-option-categories${categoryForm.id ? `/${categoryForm.id}` : ""}`, {
      method: categoryForm.id ? "PUT" : "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        locationId,
        name: categoryForm.name.trim(),
        nameZh: categoryForm.nameZh.trim() || null,
        nameKo: categoryForm.nameKo.trim() || null,
        description: categoryForm.description.trim() || null,
        isRequired: categoryForm.isRequired,
        minSelect: Number(categoryForm.minSelect || 0),
        maxSelect: categoryForm.maxSelect ? Number(categoryForm.maxSelect) : null,
        sortOrder: Number(categoryForm.sortOrder || 0),
        isActive: categoryForm.isActive,
      }),
    }).catch(() => null);
    if (!response?.ok) setError(await readError(response, "Unable to save add-on category."));
    else {
      setCategoryForm(null);
      setMessage("Add-on category saved.");
      await loadLibrary();
    }
    setSaving(false);
  }

  async function saveOption(event: FormEvent) {
    event.preventDefault();
    if (!optionForm) return;
    const token = localStorage.getItem("umika_access_token");
    if (!token) return;
    setSaving(true);
    setError(null);
    const response = await fetch(`/api/manager/menu-options${optionForm.id ? `/${optionForm.id}` : ""}`, {
      method: optionForm.id ? "PUT" : "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        categoryId: optionForm.categoryId,
        name: optionForm.name.trim(),
        nameZh: optionForm.nameZh.trim() || null,
        nameKo: optionForm.nameKo.trim() || null,
        description: optionForm.description.trim() || null,
        priceModifier: optionForm.priceModifier || "0.00",
        sortOrder: Number(optionForm.sortOrder || 0),
        isActive: optionForm.isActive,
      }),
    }).catch(() => null);
    if (!response?.ok) setError(await readError(response, "Unable to save add-on."));
    else {
      setOptionForm(null);
      setMessage("Add-on saved.");
      await loadLibrary();
    }
    setSaving(false);
  }

  async function remove(kind: "category" | "option", id: string) {
    if (!window.confirm(`Delete this ${kind}?`)) return;
    const token = localStorage.getItem("umika_access_token");
    if (!token) return;
    const response = await fetch(`/api/manager/menu-${kind === "category" ? "option-categories" : "options"}/${id}`, {
      method: "DELETE", headers: { Authorization: `Bearer ${token}` },
    }).catch(() => null);
    if (!response?.ok) setError(await readError(response, `Unable to delete ${kind}.`));
    else await loadLibrary();
  }

  async function openAssignments(item: MenuItemDto) {
    if (!item.id) return;
    const token = localStorage.getItem("umika_access_token");
    if (!token) return;
    setAssignmentItem(item);
    setAssignedCategoryIds([]);
    setError(null);
    const params = locationId ? `?locationId=${encodeURIComponent(locationId)}` : "";
    const response = await fetch(`/api/manager/menu-items/${item.id}/option-categories${params}`, {
      headers: { Authorization: `Bearer ${token}` }, cache: "no-store",
    }).catch(() => null);
    if (!response?.ok) setError(await readError(response, "Unable to load item add-ons."));
    else {
      const groups = (await response.json()) as Array<{ id?: string | null }>;
      setAssignedCategoryIds(groups.map((group) => group.id).filter((id): id is string => Boolean(id)));
    }
  }

  async function saveAssignments() {
    if (!assignmentItem?.id) return;
    const token = localStorage.getItem("umika_access_token");
    if (!token) return;
    setSaving(true);
    const params = locationId ? `?locationId=${encodeURIComponent(locationId)}` : "";
    const response = await fetch(`/api/manager/menu-items/${assignmentItem.id}/option-categories${params}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ categoryIds: assignedCategoryIds }),
    }).catch(() => null);
    if (!response?.ok) setError(await readError(response, "Unable to update item add-ons."));
    else {
      setAssignmentItem(null);
      setMessage("Menu item add-ons updated.");
    }
    setSaving(false);
  }

  return (
    <Card className="rounded-md shadow-none">
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-base"><Settings2 className="h-4 w-4" /> Add-on options</CardTitle>
          <p className="mt-1 text-sm text-slate-500">Create reusable groups such as sauces, wrappers, and extras, then enable them per menu item.</p>
        </div>
        <Button disabled={!canChangeLocation && !locationId} onClick={() => setCategoryForm(emptyCategory())} size="sm" type="button">
          <Plus className="h-4 w-4" /> Category
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {message ? <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{message}</p> : null}
        {error ? <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}
        {loading ? <p className="text-sm text-slate-500">Loading add-ons...</p> : null}
        {!loading && categories.length === 0 ? <p className="rounded-md border border-dashed p-4 text-sm text-slate-500">No add-on categories yet.</p> : null}
        <div className="grid gap-3 lg:grid-cols-2">
          {categories.map((category) => {
            const categoryOptions = optionsByCategory.get(category.id ?? "") ?? [];
            const editable = category.locationId === locationId;
            return (
              <section className="rounded-md border border-slate-200 p-4" key={category.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-slate-950">{category.name}</h3>
                      <Badge className={category.locationId ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-100 text-slate-700"}>
                        {category.locationId ? "Location" : "Global"}
                      </Badge>
                      {category.isRequired ? <Badge>Required</Badge> : null}
                    </div>
                    <p className="mt-1 text-xs text-slate-500">Select {category.minSelect ?? 0} to {category.maxSelect ?? "any"}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button aria-label={`Add option to ${category.name}`} disabled={!editable} onClick={() => setOptionForm(emptyOption(category.id ?? ""))} size="icon" type="button" variant="outline"><Plus className="h-4 w-4" /></Button>
                    <Button aria-label={`Edit ${category.name}`} disabled={!editable} onClick={() => setCategoryForm(toCategoryForm(category))} size="icon" type="button" variant="outline"><Pencil className="h-4 w-4" /></Button>
                    <Button aria-label={`Delete ${category.name}`} disabled={!editable} onClick={() => void remove("category", category.id ?? "")} size="icon" type="button" variant="outline"><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
                <div className="mt-3 divide-y divide-slate-100 border-t border-slate-100">
                  {categoryOptions.map((option) => (
                    <div className="flex items-center justify-between gap-3 py-2" key={option.id}>
                      <div className="min-w-0"><p className="truncate text-sm font-medium">{option.name}</p><p className="text-xs text-slate-500">{money(option.priceModifier)}</p></div>
                      <div className="flex gap-2">
                        <Button aria-label={`Edit ${option.name}`} disabled={!editable} onClick={() => setOptionForm(toOptionForm(option))} size="icon" type="button" variant="ghost"><Pencil className="h-4 w-4" /></Button>
                        <Button aria-label={`Delete ${option.name}`} disabled={!editable} onClick={() => void remove("option", option.id ?? "")} size="icon" type="button" variant="ghost"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  ))}
                  {categoryOptions.length === 0 ? <p className="py-3 text-sm text-slate-500">No options in this category.</p> : null}
                </div>
              </section>
            );
          })}
        </div>
        <div className="border-t border-slate-200 pt-4">
          <p className="mb-3 text-sm font-semibold">Enable add-ons on menu items</p>
          <div className="flex flex-wrap gap-2">
            {menuItems.filter((item) => item.id && item.isDeleted !== true).map((item) => (
              <Button key={item.id} onClick={() => void openAssignments(item)} size="sm" type="button" variant="outline">
                <CheckSquare2 className="h-4 w-4" /> {item.name}
              </Button>
            ))}
          </div>
        </div>
      </CardContent>

      <CategoryDialog form={categoryForm} saving={saving} onChange={setCategoryForm} onSubmit={saveCategory} />
      <OptionDialog form={optionForm} saving={saving} onChange={setOptionForm} onSubmit={saveOption} />
      <Dialog open={Boolean(assignmentItem)} onOpenChange={(open) => !open && setAssignmentItem(null)}>
        <DialogContent className="w-[min(96vw,36rem)]">
          <DialogHeader><DialogTitle>Add-ons for {assignmentItem?.name}</DialogTitle><DialogDescription>Checked categories appear in the customer item popup for this menu and location.</DialogDescription></DialogHeader>
          <div className="space-y-2 p-5">
            {categories.filter((category) => category.isActive !== false).map((category) => (
              <label className="flex min-h-11 items-center gap-3 rounded-md border border-slate-200 px-3 py-2 text-sm" key={category.id}>
                <input checked={assignedCategoryIds.includes(category.id ?? "")} onChange={() => toggleId(category.id ?? "", assignedCategoryIds, setAssignedCategoryIds)} type="checkbox" />
                <span className="flex-1 font-medium">{category.name}</span>
                <span className="text-xs text-slate-500">{(optionsByCategory.get(category.id ?? "") ?? []).filter((option) => option.isActive !== false).length} options</span>
              </label>
            ))}
          </div>
          <DialogFooter><Button onClick={() => setAssignmentItem(null)} type="button" variant="outline">Cancel</Button><Button disabled={saving} onClick={() => void saveAssignments()} type="button">Save add-ons</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function CategoryDialog({ form, saving, onChange, onSubmit }: { form: CategoryForm | null; saving: boolean; onChange: (value: CategoryForm | null) => void; onSubmit: (event: FormEvent) => void }) {
  return <Dialog open={Boolean(form)} onOpenChange={(open) => !open && onChange(null)}><DialogContent className="w-[min(96vw,44rem)]">{form ? <form onSubmit={onSubmit}><DialogHeader><DialogTitle>{form.id ? "Edit" : "Add"} add-on category</DialogTitle><DialogDescription>Group reusable choices shown together on the customer menu.</DialogDescription></DialogHeader><div className="grid gap-4 p-5 sm:grid-cols-2">
    <Input label="English name" value={form.name} onChange={(name) => onChange({ ...form, name })} required />
    <Input label="Chinese name" value={form.nameZh} onChange={(nameZh) => onChange({ ...form, nameZh })} />
    <Input label="Korean name" value={form.nameKo} onChange={(nameKo) => onChange({ ...form, nameKo })} />
    <Input label="Description" value={form.description} onChange={(description) => onChange({ ...form, description })} />
    <Input label="Minimum selections" min="0" type="number" value={form.minSelect} onChange={(minSelect) => onChange({ ...form, minSelect })} />
    <Input label="Maximum selections" min="1" type="number" value={form.maxSelect} onChange={(maxSelect) => onChange({ ...form, maxSelect })} />
    <Input label="Display order" type="number" value={form.sortOrder} onChange={(sortOrder) => onChange({ ...form, sortOrder })} />
    <label className="flex items-center gap-3 text-sm"><input checked={form.isRequired} onChange={(event) => onChange({ ...form, isRequired: event.target.checked })} type="checkbox" /> Required choice</label>
    <label className="flex items-center gap-3 text-sm"><input checked={form.isActive} onChange={(event) => onChange({ ...form, isActive: event.target.checked })} type="checkbox" /> Active</label>
  </div><DialogFooter><Button onClick={() => onChange(null)} type="button" variant="outline">Cancel</Button><Button disabled={saving} type="submit">Save category</Button></DialogFooter></form> : null}</DialogContent></Dialog>;
}

function OptionDialog({ form, saving, onChange, onSubmit }: { form: OptionForm | null; saving: boolean; onChange: (value: OptionForm | null) => void; onSubmit: (event: FormEvent) => void }) {
  return <Dialog open={Boolean(form)} onOpenChange={(open) => !open && onChange(null)}><DialogContent className="w-[min(96vw,44rem)]">{form ? <form onSubmit={onSubmit}><DialogHeader><DialogTitle>{form.id ? "Edit" : "Add"} add-on</DialogTitle><DialogDescription>Create a priced choice such as cream cheese, soy paper, or extra sauce.</DialogDescription></DialogHeader><div className="grid gap-4 p-5 sm:grid-cols-2">
    <Input label="English name" value={form.name} onChange={(name) => onChange({ ...form, name })} required />
    <Input label="Chinese name" value={form.nameZh} onChange={(nameZh) => onChange({ ...form, nameZh })} />
    <Input label="Korean name" value={form.nameKo} onChange={(nameKo) => onChange({ ...form, nameKo })} />
    <Input label="Description" value={form.description} onChange={(description) => onChange({ ...form, description })} />
    <Input label="Extra price" min="0" step="0.01" type="number" value={form.priceModifier} onChange={(priceModifier) => onChange({ ...form, priceModifier })} />
    <Input label="Display order" type="number" value={form.sortOrder} onChange={(sortOrder) => onChange({ ...form, sortOrder })} />
    <label className="flex items-center gap-3 text-sm"><input checked={form.isActive} onChange={(event) => onChange({ ...form, isActive: event.target.checked })} type="checkbox" /> Active</label>
  </div><DialogFooter><Button onClick={() => onChange(null)} type="button" variant="outline">Cancel</Button><Button disabled={saving} type="submit">Save add-on</Button></DialogFooter></form> : null}</DialogContent></Dialog>;
}

function Input({ label, onChange, ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, "onChange"> & { label: string; onChange: (value: string) => void }) {
  return <label className="space-y-2"><span className="block text-xs font-semibold uppercase text-slate-500">{label}</span><input {...props} className="h-10 w-full rounded-md border border-slate-200 px-3 text-base sm:text-sm" onChange={(event) => onChange(event.target.value)} /></label>;
}

function toCategoryForm(value: MenuOptionCategoryDto): CategoryForm {
  return { id: value.id ?? "", name: value.name, nameZh: value.nameZh ?? "", nameKo: value.nameKo ?? "", description: value.description ?? "", isRequired: value.isRequired ?? false, minSelect: String(value.minSelect ?? 0), maxSelect: value.maxSelect == null ? "" : String(value.maxSelect), sortOrder: String(value.sortOrder ?? 0), isActive: value.isActive ?? true };
}

function toOptionForm(value: MenuOptionDto): OptionForm {
  return { id: value.id ?? "", categoryId: value.categoryId, name: value.name, nameZh: value.nameZh ?? "", nameKo: value.nameKo ?? "", description: value.description ?? "", priceModifier: String(value.priceModifier ?? 0), sortOrder: String(value.sortOrder ?? 0), isActive: value.isActive ?? true };
}

function toggleId(id: string, values: string[], setValues: (values: string[]) => void) {
  setValues(values.includes(id) ? values.filter((value) => value !== id) : [...values, id]);
}

function money(value: string | number | null) {
  const amount = Number(value ?? 0);
  return amount === 0 ? "No extra charge" : `+$${amount.toFixed(2)}`;
}

async function readError(response: Response | null, fallback: string) {
  if (!response) return fallback;
  const body = await response.json().catch(() => null) as { message?: string; error?: { message?: string } } | null;
  return body?.error?.message ?? body?.message ?? fallback;
}
