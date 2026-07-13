import { useMemo } from "react";
import { useCart } from "@/components/store/CartProvider";
import { isMenuProduct } from "@/lib/cart-products";
import { getUnitPrice } from "@/lib/pricing";
import type { ActivityCartItemSnapshot } from "@/lib/activity-cart";
import type { Product } from "@/lib/types";

export function useCartActivitySnapshot(products: Product[]) {
  const { items } = useCart();

  return useMemo(() => {
    const cartItems = items
      .map((item) => {
        const product = products.find((p) => p.id === item.productId);
        if (!product || !isMenuProduct(product)) return null;
        const unitPrice = getUnitPrice(product);
        return {
          productId: product.id,
          quantity: item.quantity,
          title: product.title,
          unitPriceInr: unitPrice,
          lineTotalInr: unitPrice * item.quantity,
        } satisfies ActivityCartItemSnapshot;
      })
      .filter(Boolean) as ActivityCartItemSnapshot[];

    const cartValueInr =
      cartItems.length > 0
        ? cartItems.reduce((sum, line) => sum + (line.lineTotalInr ?? 0), 0)
        : null;

    return {
      cartValueInr,
      cartItems,
      itemCount: cartItems.reduce((sum, line) => sum + line.quantity, 0),
    };
  }, [items, products]);
}
