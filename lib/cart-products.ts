import type { Product } from "@/lib/types";

const DELIVERY_PRODUCT_TITLE =
  /^(delivery(\s+(fee|charge))?|delivery fee|delivery charge)$/i;

/** Menu items only — excludes accidental delivery-fee products in the catalog. */
export function isMenuProduct(product: Product): boolean {
  return !DELIVERY_PRODUCT_TITLE.test(product.title.trim());
}

export function getMenuProductIds(products: Product[]): string[] {
  return products.filter(isMenuProduct).map((p) => p.id);
}
