import Image from "next/image";
import Link from "next/link";
import { fetchDashboardProducts } from "@/lib/dashboard";
import { formatCurrency } from "@/lib/delivery";

export async function DashboardProducts() {
  const { productsWithOrders, totalUnits30d, lowStock } =
    await fetchDashboardProducts();

  return (
    <>
      <section className="mt-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-[#4B2C20]">Products</h2>
            <p className="mt-0.5 text-sm text-[#4B2C20]/60">
              Units sold in the last 30 days · {totalUnits30d} total
            </p>
          </div>
          <Link
            href="/admin/products"
            className="text-sm font-medium text-[#4B2C20] underline-offset-4 hover:underline"
          >
            Manage products
          </Link>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {productsWithOrders.length === 0 ? (
            <p className="col-span-full rounded-2xl bg-white p-8 text-center text-sm text-[#4B2C20]/50 ring-1 ring-[#4B2C20]/10">
              No products yet.
            </p>
          ) : (
            productsWithOrders.map(({ product, orderCount }) => (
              <article
                key={product.id}
                className="overflow-hidden rounded-2xl bg-white ring-1 ring-[#4B2C20]/10"
              >
                <div className="relative aspect-[16/10] bg-[#F5E6D3]">
                  <Image
                    src={product.image_path || "/hero-tiramisu.png"}
                    alt={product.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, 33vw"
                  />
                  {!product.is_active && (
                    <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white">
                      Inactive
                    </span>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-medium text-[#4B2C20]">{product.title}</h3>
                  <p className="mt-0.5 text-xs text-[#4B2C20]/50">
                    {formatCurrency(product.price_inr)}
                  </p>
                  <div className="mt-4 flex items-end justify-between border-t border-[#4B2C20]/10 pt-3">
                    <p className="text-[10px] uppercase tracking-wide text-[#4B2C20]/40">
                      30-day orders
                    </p>
                    <p className="text-2xl font-semibold tabular-nums text-[#4B2C20]">
                      {orderCount}
                    </p>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      {lowStock.length > 0 && (
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <h2 className="text-sm font-medium text-amber-800">
            Near low stock today
          </h2>
          <ul className="mt-2 space-y-1 text-sm text-amber-700">
            {lowStock.map((p) => (
              <li key={p.id}>{p.title}</li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
