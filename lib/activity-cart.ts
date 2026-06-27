export interface ActivityCartItemSnapshot {
  productId: string;
  quantity: number;
  title?: string;
  unitPriceInr?: number;
  lineTotalInr?: number;
}

export function normalizeActivityCartItems(
  raw: unknown
): ActivityCartItemSnapshot[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const productId =
        typeof row.productId === "string"
          ? row.productId
          : typeof row.product_id === "string"
            ? row.product_id
            : null;
      const quantity =
        typeof row.quantity === "number" && row.quantity > 0
          ? row.quantity
          : null;
      if (!productId || !quantity) return null;

      return {
        productId,
        quantity,
        title: typeof row.title === "string" ? row.title : undefined,
        unitPriceInr:
          typeof row.unitPriceInr === "number"
            ? row.unitPriceInr
            : typeof row.unit_price_inr === "number"
              ? row.unit_price_inr
              : undefined,
        lineTotalInr:
          typeof row.lineTotalInr === "number"
            ? row.lineTotalInr
            : typeof row.line_total_inr === "number"
              ? row.line_total_inr
              : undefined,
      } satisfies ActivityCartItemSnapshot;
    })
    .filter(Boolean) as ActivityCartItemSnapshot[];
}

export function cartItemsCount(items: ActivityCartItemSnapshot[]): number {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}
