import { describe, expect, it } from "vitest";
import {
  getMaxQuantityForProduct,
  PRE_ORDER_MAX_QUANTITY_PER_ITEM,
} from "@/lib/inventory";

describe("getMaxQuantityForProduct", () => {
  it("caps pre-order at the fixed per-item limit", () => {
    expect(getMaxQuantityForProduct("pre_order")).toBe(
      PRE_ORDER_MAX_QUANTITY_PER_ITEM
    );
    expect(getMaxQuantityForProduct("pre_order", 2)).toBe(
      PRE_ORDER_MAX_QUANTITY_PER_ITEM
    );
  });

  it("caps same-day at remaining stock when known", () => {
    expect(getMaxQuantityForProduct("same_day", 3)).toBe(3);
    expect(getMaxQuantityForProduct("same_day", 1)).toBe(1);
    expect(getMaxQuantityForProduct("same_day", 0)).toBe(0);
  });

  it("does not invent a same-day cap when remaining is unknown", () => {
    expect(getMaxQuantityForProduct("same_day")).toBeUndefined();
    expect(getMaxQuantityForProduct("same_day", null)).toBeUndefined();
    expect(getMaxQuantityForProduct("same_day", Number.NaN)).toBeUndefined();
  });

  it("does not cap when delivery mode is missing", () => {
    expect(getMaxQuantityForProduct(null, 3)).toBeUndefined();
    expect(getMaxQuantityForProduct(undefined, 3)).toBeUndefined();
  });
});
