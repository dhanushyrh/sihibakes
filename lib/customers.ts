import type { SupabaseClient } from "@supabase/supabase-js";
import {
  normalizeEmail,
  normalizeIndianPhone,
} from "@/lib/checkout-validation";

export type EnsureCustomerInput = {
  phone: string;
  name: string;
  email?: string | null;
};

/**
 * Find or create a customer by normalized phone so offline and online
 * orders always share one profile (phone is UNIQUE on customers).
 */
export async function ensureCustomerByPhone(
  admin: SupabaseClient,
  input: EnsureCustomerInput
): Promise<{ id: string } | null> {
  const phone = normalizeIndianPhone(input.phone);
  const name = input.name.trim();
  const email = input.email?.trim()
    ? normalizeEmail(input.email)
    : null;

  if (!phone || !name) return null;

  const { data: existing } = await admin
    .from("customers")
    .select("id, name, email")
    .eq("phone", phone)
    .maybeSingle();

  if (existing) {
    const updates: { name?: string; email?: string } = {};
    if (name && name !== existing.name) updates.name = name;
    if (email && email !== (existing.email ?? null)) updates.email = email;

    if (Object.keys(updates).length > 0) {
      const { error } = await admin
        .from("customers")
        .update(updates)
        .eq("id", existing.id);
      if (error) {
        console.error("Failed to update customer profile:", error.message);
      }
    }

    return { id: existing.id };
  }

  const { data: created, error } = await admin
    .from("customers")
    .insert({ name, phone, email })
    .select("id")
    .single();

  if (created?.id) return { id: created.id };

  // Concurrent insert with same phone — reuse the winner.
  if (error) {
    const { data: raced } = await admin
      .from("customers")
      .select("id")
      .eq("phone", phone)
      .maybeSingle();
    if (raced?.id) return { id: raced.id };
    console.error("Failed to create customer:", error.message);
  }

  return null;
}
