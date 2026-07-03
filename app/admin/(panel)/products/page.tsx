import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/mock-data";
import type { Product } from "@/lib/types";
import { ProductsPageClient } from "./ProductsPageClient";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  let initialProducts: Product[] = [];

  if (isSupabaseConfigured() && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const admin = createAdminClient();
    const { data } = await admin
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    initialProducts = (data ?? []) as Product[];
  }

  return <ProductsPageClient initialProducts={initialProducts} />;
}
