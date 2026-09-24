"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent, InputHTMLAttributes } from "react";
import { CheckSquare2, Info, Pencil, Plus, Search, Settings2, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { SpringPage } from "@/lib/location-types";
import type { Locale } from "@/lib/i18n";
import type { MenuCategoryDto, MenuItemDto, MenuOptionCategoryDto, MenuOptionDto } from "@/lib/menu-management-types";

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

const optionAssignmentCopy = {
  en: {
    libraryDescription: "Create reusable add-on groups, assign defaults by menu category, then customize individual items when needed.",
    byCategoryTitle: "Set add-ons by menu category",
    byCategoryDescription: "Choose the default add-ons for every item in a menu category.",
    byItemTitle: "Customize one menu item",
    byItemDescription: "Search by item name to give one item its own add-on selection.",
    searchItemsLabel: "Search menu items",
    searchItemsPlaceholder: "Search by menu item name",
    searchItemsHint: "Search results will appear here.",
    noMatchingItems: "No menu items match that name.",
    noMenuCategories: "No menu categories are available in this location.",
    noActiveAddOnCategories: "There are no active add-on categories to assign.",
    loadingAssignments: "Loading current add-on assignments...",
    unableLoadAssignments: "Unable to load add-on assignments.",
    itemCount: "{count} menu items",
    setAddOns: "Set add-ons",
    addOnsFor: "Add-ons for {name}",
    categoryDialogDescription: "Selected add-on groups become the default for every item in this menu category.",
    itemDialogDescription: "Custom selections replace the add-ons inherited from the item's menu category.",
    inheritCategoryDefaults: "Use menu category defaults",
    saveAssignments: "Save add-ons",
  },
  zh: {
    libraryDescription: "创建可重复使用的加料分组，按菜单分类设置默认选项，并可按需自定义单个菜品。",
    byCategoryTitle: "按菜单分类设置加料选项",
    byCategoryDescription: "为菜单分类中的所有菜品选择默认加料选项。",
    byItemTitle: "自定义单个菜品",
    byItemDescription: "按菜品名称搜索，为单个菜品设置专属加料选项。",
    searchItemsLabel: "搜索菜单菜品",
    searchItemsPlaceholder: "按菜品名称搜索",
    searchItemsHint: "搜索结果会显示在这里。",
    noMatchingItems: "没有找到匹配的菜品。",
    noMenuCategories: "此门店没有可用的菜单分类。",
    noActiveAddOnCategories: "没有可分配的启用加料分类。",
    loadingAssignments: "正在加载当前加料设置...",
    unableLoadAssignments: "无法加载加料设置。",
    itemCount: "{count} 个菜品",
    setAddOns: "设置加料",
    addOnsFor: "为 {name} 设置加料",
    categoryDialogDescription: "所选加料分类将成为此菜单分类中所有菜品的默认选项。",
    itemDialogDescription: "自定义选项会替代该菜品继承的菜单分类加料选项。",
    inheritCategoryDefaults: "使用菜单分类默认选项",
    saveAssignments: "保存加料选项",
  },
  ko: {
    libraryDescription: "재사용 가능한 추가 옵션 그룹을 만들고 카테고리별 기본값을 설정한 뒤 필요한 메뉴만 개별 사용자 지정합니다.",
    byCategoryTitle: "메뉴 카테고리별 추가 옵션 설정",
    byCategoryDescription: "카테고리의 모든 메뉴에 적용할 기본 추가 옵션을 선택합니다.",
    byItemTitle: "개별 메뉴 사용자 지정",
    byItemDescription: "메뉴 이름을 검색해 특정 메뉴만의 추가 옵션을 설정합니다.",
    searchItemsLabel: "메뉴 검색",
    searchItemsPlaceholder: "메뉴 이름으로 검색",
    searchItemsHint: "검색 결과가 여기에 표시됩니다.",
    noMatchingItems: "일치하는 메뉴가 없습니다.",
    noMenuCategories: "이 매장에 사용할 수 있는 메뉴 카테고리가 없습니다.",
    noActiveAddOnCategories: "할당할 활성 추가 옵션 카테고리가 없습니다.",
    loadingAssignments: "현재 추가 옵션 설정을 불러오는 중...",
    unableLoadAssignments: "추가 옵션 설정을 불러오지 못했습니다.",
    itemCount: "메뉴 {count}개",
    setAddOns: "추가 옵션 설정",
    addOnsFor: "{name} 추가 옵션",
    categoryDialogDescription: "선택한 추가 옵션 그룹이 이 카테고리의 모든 메뉴에 기본 적용됩니다.",
    itemDialogDescription: "사용자 지정 옵션은 메뉴 카테고리에서 상속된 추가 옵션을 대체합니다.",
    inheritCategoryDefaults: "메뉴 카테고리 기본값 사용",
    saveAssignments: "추가 옵션 저장",
  },
} satisfies Record<Locale, Record<string, string>>;

export function MenuOptionManager({
  locationId,
  canChangeLocation,
  menuCategories,
  menuItems,
  locale,
}: {
  locationId: string | null;
  canChangeLocation: boolean;
  menuCategories: MenuCategoryDto[];
  menuItems: MenuItemDto[];
  locale: Locale;
}) {
  const [categories, setCategories] = useState<MenuOptionCategoryDto[]>([]);
  const [options, setOptions] = useState<MenuOptionDto[]>([]);
  const [categoryForm, setCategoryForm] = useState<CategoryForm | null>(null);
  const [optionForm, setOptionForm] = useState<OptionForm | null>(null);
  const [assignmentTarget, setAssignmentTarget] = useState<{ type: "menuCategory" | "item"; id: string; name: string } | null>(null);
  const [assignedCategoryIds, setAssignedCategoryIds] = useState<string[]>([]);
  const [inheritsCategoryDefaults, setInheritsCategoryDefaults] = useState(true);
  const [assignmentLoading, setAssignmentLoading] = useState(false);
  const [assignmentError, setAssignmentError] = useState<string | null>(null);
  const [itemSearch, setItemSearch] = useState("");
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

  const matchingItems = useMemo(() => {
    const query = itemSearch.trim().toLocaleLowerCase();
    if (!query) return [];
    return menuItems
      .filter((item) => item.id && item.isDeleted !== true && item.name.toLocaleLowerCase().includes(query))
      .slice(0, 12);
  }, [itemSearch, menuItems]);

  const copy = optionAssignmentCopy[locale];

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

  async function openAssignments(target: { type: "menuCategory" | "item"; id: string; name: string }) {
    const token = localStorage.getItem("umika_access_token");
    if (!token) return;
    setAssignmentTarget(target);
    setAssignmentLoading(true);
    setAssignedCategoryIds([]);
    setInheritsCategoryDefaults(target.type === "item");
    setAssignmentError(null);
    setError(null);
    const params = locationId ? `?locationId=${encodeURIComponent(locationId)}` : "";
    const endpoint = target.type === "item"
      ? `/api/manager/menu-items/${target.id}/option-categories${params}`
      : `/api/manager/menu-categories/${target.id}/option-categories${params}`;
    const response = await fetch(endpoint, {
      headers: { Authorization: `Bearer ${token}` }, cache: "no-store",
    }).catch(() => null);
    try {
      if (!response?.ok) {
        setAssignmentError(await readError(response, copy.unableLoadAssignments));
      } else {
        const assignment = await response.json() as {
          customized?: boolean;
          categoryIds?: string[];
          effectiveCategoryIds?: string[];
        };
        const customized = target.type === "menuCategory" || assignment.customized === true;
        setInheritsCategoryDefaults(!customized);
        setAssignedCategoryIds(customized
          ? assignment.categoryIds ?? []
          : assignment.effectiveCategoryIds ?? []);
      }
    } catch {
      setAssignmentError(copy.unableLoadAssignments);
    } finally {
      setAssignmentLoading(false);
    }
  }

  async function saveAssignments() {
    if (!assignmentTarget) return;
    const token = localStorage.getItem("umika_access_token");
    if (!token) return;
    setSaving(true);
    const params = locationId ? `?locationId=${encodeURIComponent(locationId)}` : "";
    const endpoint = assignmentTarget.type === "item"
      ? `/api/manager/menu-items/${assignmentTarget.id}/option-categories${params}`
      : `/api/manager/menu-categories/${assignmentTarget.id}/option-categories${params}`;
    const response = await fetch(endpoint, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        categoryIds: assignedCategoryIds,
        customized: assignmentTarget.type === "item" && !inheritsCategoryDefaults,
      }),
    }).catch(() => null);
    if (!response?.ok) setError(await readError(response, "Unable to update add-on assignments."));
    else {
      setAssignmentTarget(null);
      setItemSearch("");
      setMessage(assignmentTarget.type === "item" ? "Menu item add-ons updated." : "Menu category add-ons updated.");
    }
    setSaving(false);
  }

  return (
    <Card className="rounded-md shadow-none">
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-base"><Settings2 className="h-4 w-4" /> Add-on options</CardTitle>
          <p className="mt-1 text-sm text-slate-500">{copy.libraryDescription}</p>
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
        <div className="space-y-5 border-t border-slate-200 pt-4">
          <section className="space-y-3">
            <div>
              <p className="text-sm font-semibold">{copy.byCategoryTitle}</p>
              <p className="mt-1 text-sm text-slate-500">{copy.byCategoryDescription}</p>
            </div>
            {menuCategories.filter((category) => category.id && category.isDeleted !== true).length ? (
              <div className="divide-y divide-slate-100 rounded-md border border-slate-200">
                {menuCategories.filter((category) => category.id && category.isDeleted !== true).map((category) => {
                  const itemCount = menuItems.filter((item) => item.categoryId === category.id && item.isDeleted !== true).length;
                  return (
                    <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5" key={category.id}>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">{category.name}</p>
                        <p className="text-xs text-slate-500">{copy.itemCount.replace("{count}", String(itemCount))}</p>
                      </div>
                      <Button onClick={() => void openAssignments({ type: "menuCategory", id: category.id!, name: category.name })} size="sm" type="button" variant="outline">
                        <CheckSquare2 className="h-4 w-4" /> {copy.setAddOns}
                      </Button>
                    </div>
                  );
                })}
              </div>
            ) : <p className="rounded-md border border-dashed p-3 text-sm text-slate-500">{copy.noMenuCategories}</p>}
          </section>

          <section className="space-y-3">
            <div>
              <p className="text-sm font-semibold">{copy.byItemTitle}</p>
              <p className="mt-1 text-sm text-slate-500">{copy.byItemDescription}</p>
            </div>
            <label className="relative block">
              <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                aria-label={copy.searchItemsLabel}
                className="h-11 w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 text-base outline-none focus:border-primary sm:text-sm"
                onChange={(event) => setItemSearch(event.target.value)}
                placeholder={copy.searchItemsPlaceholder}
                type="search"
                value={itemSearch}
              />
            </label>
            {itemSearch.trim() ? (
              matchingItems.length ? (
                <div className="divide-y divide-slate-100 rounded-md border border-slate-200">
                  {matchingItems.map((item) => (
                    <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5" key={item.id}>
                      <p className="min-w-0 truncate text-sm font-medium text-slate-900">{item.name}</p>
                      <Button onClick={() => void openAssignments({ type: "item", id: item.id!, name: item.name })} size="sm" type="button" variant="outline">
                        <CheckSquare2 className="h-4 w-4" /> {copy.setAddOns}
                      </Button>
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-slate-500">{copy.noMatchingItems}</p>
            ) : <p className="text-xs text-slate-500">{copy.searchItemsHint}</p>}
          </section>
        </div>
      </CardContent>

      <CategoryDialog form={categoryForm} locale={locale} saving={saving} onChange={setCategoryForm} onSubmit={saveCategory} />
      <OptionDialog form={optionForm} saving={saving} onChange={setOptionForm} onSubmit={saveOption} />
      <Dialog open={Boolean(assignmentTarget)} onOpenChange={(open) => !open && setAssignmentTarget(null)}>
        <DialogContent className="w-[min(96vw,36rem)]">
          <DialogHeader>
            <DialogTitle>{copy.addOnsFor.replace("{name}", assignmentTarget?.name ?? "")}</DialogTitle>
            <DialogDescription>{assignmentTarget?.type === "menuCategory" ? copy.categoryDialogDescription : copy.itemDialogDescription}</DialogDescription>
          </DialogHeader>
          {assignmentLoading ? <p className="px-5 text-sm text-slate-500">{copy.loadingAssignments}</p> : null}
          {assignmentError ? <p className="mx-5 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{assignmentError}</p> : null}
          {assignmentTarget?.type === "item" ? (
            <label className="mx-5 flex min-h-11 items-center gap-3 rounded-md border border-slate-200 px-3 py-2 text-sm">
              <input checked={inheritsCategoryDefaults} onChange={(event) => setInheritsCategoryDefaults(event.target.checked)} type="checkbox" />
              <span className="font-medium">{copy.inheritCategoryDefaults}</span>
            </label>
          ) : null}
          <div className="space-y-2 p-5">
            {categories.filter((category) => category.isActive !== false).length ? categories.filter((category) => category.isActive !== false).map((category) => (
              <label className="flex min-h-11 items-center gap-3 rounded-md border border-slate-200 px-3 py-2 text-sm" key={category.id}>
                <input checked={assignedCategoryIds.includes(category.id ?? "")} disabled={assignmentTarget?.type === "item" && inheritsCategoryDefaults} onChange={() => toggleId(category.id ?? "", assignedCategoryIds, setAssignedCategoryIds)} type="checkbox" />
                <span className="flex-1 font-medium">{category.name}</span>
                <span className="text-xs text-slate-500">{(optionsByCategory.get(category.id ?? "") ?? []).filter((option) => option.isActive !== false).length} options</span>
              </label>
            )) : <p className="text-sm text-slate-500">{copy.noActiveAddOnCategories}</p>}
          </div>
          <DialogFooter><Button onClick={() => setAssignmentTarget(null)} type="button" variant="outline">Cancel</Button><Button disabled={saving || assignmentLoading || Boolean(assignmentError)} onClick={() => void saveAssignments()} type="button">{copy.saveAssignments}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function CategoryDialog({ form, locale, saving, onChange, onSubmit }: { form: CategoryForm | null; locale: Locale; saving: boolean; onChange: (value: CategoryForm | null) => void; onSubmit: (event: FormEvent) => void }) {
  const requiredHelp = locale === "zh"
    ? "顾客必须达到此分组选项的最少选择数量，才能将菜品加入购物车。如果最少选择数为 0，启用后会设为 1。"
    : locale === "ko"
      ? "고객은 메뉴를 장바구니에 담기 전에 이 그룹의 최소 선택 수를 충족해야 합니다. 최소 선택 수가 0이면 필수로 설정할 때 1로 적용됩니다."
      : "Customers must meet this group's minimum selection count before adding the item to their cart. If the minimum is 0, enabling this sets it to 1.";
  const requiredHelpLabel = locale === "zh" ? "必选选项说明" : locale === "ko" ? "필수 선택 도움말" : "Required choice help";
  return <Dialog open={Boolean(form)} onOpenChange={(open) => !open && onChange(null)}><DialogContent className="w-[min(96vw,44rem)]">{form ? <form onSubmit={onSubmit}><DialogHeader><DialogTitle>{form.id ? "Edit" : "Add"} add-on category</DialogTitle><DialogDescription>Group reusable choices shown together on the customer menu.</DialogDescription></DialogHeader><div className="grid gap-4 p-5 sm:grid-cols-2">
    <Input label="English name" value={form.name} onChange={(name) => onChange({ ...form, name })} required />
    <Input label="Chinese name" value={form.nameZh} onChange={(nameZh) => onChange({ ...form, nameZh })} />
    <Input label="Korean name" value={form.nameKo} onChange={(nameKo) => onChange({ ...form, nameKo })} />
    <Input label="Description" value={form.description} onChange={(description) => onChange({ ...form, description })} />
    <Input label="Minimum selections" min="0" type="number" value={form.minSelect} onChange={(minSelect) => onChange({ ...form, minSelect })} />
    <Input label="Maximum selections" min="1" type="number" value={form.maxSelect} onChange={(maxSelect) => onChange({ ...form, maxSelect })} />
    <Input label="Display order" type="number" value={form.sortOrder} onChange={(sortOrder) => onChange({ ...form, sortOrder })} />
    <div className="flex items-center gap-2 text-sm">
      <label className="flex items-center gap-3"><input checked={form.isRequired} onChange={(event) => onChange({ ...form, isRequired: event.target.checked })} type="checkbox" /> Required choice</label>
      <span aria-label={`${requiredHelpLabel}: ${requiredHelp}`} className="group relative inline-flex cursor-help" tabIndex={0} title={requiredHelp}>
        <Info aria-hidden="true" className="h-4 w-4 text-slate-400" />
        <span className="pointer-events-none absolute bottom-full left-0 z-50 mb-2 hidden w-72 max-w-[calc(100vw-3rem)] rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-normal leading-5 text-slate-700 shadow-xl group-hover:block group-focus:block">
          {requiredHelp}
        </span>
      </span>
    </div>
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
