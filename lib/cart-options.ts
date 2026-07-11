export type FormattedCartOptions = {
  optionText: string;
  note: string | null;
};

type OptionLike = {
  name?: unknown;
  label?: unknown;
  priceModifier?: unknown;
  modifierPrice?: unknown;
  price?: unknown;
};

export function formatCartOptions(value: unknown): FormattedCartOptions {
  const payload = parsePayload(value);

  if (!payload) {
    return { optionText: "", note: null };
  }

  const selectedOptions = Array.isArray(payload.selectedOptions)
    ? payload.selectedOptions
    : Array.isArray(payload.options)
      ? payload.options
      : [];
  const optionText = selectedOptions
    .map(formatOption)
    .filter(Boolean)
    .join(", ");
  const note = typeof payload.note === "string" && payload.note.trim() ? payload.note.trim() : null;

  return { optionText, note };
}

function parsePayload(value: unknown): Record<string, unknown> | null {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    if (!value.trim()) {
      return null;
    }

    try {
      const parsed = JSON.parse(value) as unknown;
      return isRecord(parsed) ? parsed : { raw: value };
    } catch {
      return { raw: value };
    }
  }

  return isRecord(value) ? value : null;
}

function formatOption(value: unknown) {
  if (typeof value === "string") {
    return value;
  }

  if (!isRecord(value)) {
    return "";
  }

  const option = value as OptionLike;
  const name = getString(option.name) ?? getString(option.label);
  const priceModifier = getNumber(option.priceModifier) ?? getNumber(option.modifierPrice) ?? getNumber(option.price);

  if (!name) {
    return "";
  }

  if (!priceModifier) {
    return name;
  }

  return `${name} (${priceModifier > 0 ? "+" : "-"}$${Math.abs(priceModifier).toFixed(2)})`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object");
}

function getString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  return null;
}
