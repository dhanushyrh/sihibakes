#!/usr/bin/env node
/**
 * Seed customers and paid orders for ±5 days from today.
 *
 * Usage:
 *   npm run db:seed
 *
 * Uses DATABASE_URL when set, otherwise NEXT_PUBLIC_SUPABASE_URL +
 * SUPABASE_SERVICE_ROLE_KEY from .env.local.
 *
 * Idempotent: removes prior seed rows (order_number LIKE 'SEED-%').
 */
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile(join(root, ".env.local"));
loadEnvFile(join(root, ".env"));

const DELIVERY_WINDOWS = [
  { start: "10:00", end: "12:00" },
  { start: "12:00", end: "14:00" },
  { start: "16:00", end: "18:00" },
  { start: "18:00", end: "20:00" },
];

const CUSTOMERS = [
  { name: "Priya Sharma", phone: "9800000001", email: "priya.sharma@example.com" },
  { name: "Arjun Mehta", phone: "9800000002", email: "arjun.mehta@example.com" },
  { name: "Lakshmi Reddy", phone: "9800000003", email: "lakshmi.reddy@example.com" },
  { name: "Rohan Kapoor", phone: "9800000004", email: "rohan.kapoor@example.com" },
  { name: "Ananya Iyer", phone: "9800000005", email: "ananya.iyer@example.com" },
  { name: "Vikram Singh", phone: "9800000006", email: "vikram.singh@example.com" },
  { name: "Meera Nair", phone: "9800000007", email: "meera.nair@example.com" },
  { name: "Karthik Rao", phone: "9800000008", email: "karthik.rao@example.com" },
  { name: "Divya Patel", phone: "9800000009", email: "divya.patel@example.com" },
  { name: "Suresh Kumar", phone: "9800000010", email: "suresh.kumar@example.com" },
  { name: "Neha Gupta", phone: "9800000011", email: "neha.gupta@example.com" },
  { name: "Aditya Joshi", phone: "9800000012", email: "aditya.joshi@example.com" },
];

const ADDRESSES = [
  {
    house: "12",
    street: "Koramangala 5th Block",
    landmark: "Near Sony World",
    pincode: "560095",
    lat: 12.9352,
    lng: 77.6245,
    distance_km: 3.8,
  },
  {
    house: "8A",
    street: "Indiranagar 100 Feet Road",
    landmark: "CMH Park",
    pincode: "560038",
    lat: 12.9784,
    lng: 77.6408,
    distance_km: 4.2,
  },
  {
    house: "45",
    street: "HSR Layout Sector 2",
    landmark: "Opposite NIFT",
    pincode: "560102",
    lat: 12.9116,
    lng: 77.6473,
    distance_km: 6.1,
  },
  {
    house: "3",
    street: "Jayanagar 4th Block",
    landmark: "Near Ragigudda Temple",
    pincode: "560041",
    lat: 12.9308,
    lng: 77.5838,
    distance_km: 5.4,
  },
  {
    house: "201",
    street: "Whitefield Main Road",
    landmark: "Phoenix Marketcity",
    pincode: "560048",
    lat: 12.9977,
    lng: 77.6964,
    distance_km: 11.2,
  },
  {
    house: "7",
    street: "Malleshwaram 8th Cross",
    landmark: "Sampige Road",
    pincode: "560003",
    lat: 13.0035,
    lng: 77.564,
    distance_km: 4.9,
  },
];

function formatDate(d) {
  return d.toISOString().slice(0, 10);
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function deliveryFee(distanceKm) {
  if (distanceKm < 3) return 0;
  if (distanceKm < 5) return 100;
  if (distanceKm < 10) return 150;
  return 200;
}

function statusForDate(deliveryDate, today, seq) {
  if (deliveryDate < today) {
    return seq % 7 === 0 ? "cancelled" : "delivered";
  }
  if (deliveryDate === today) {
    const mod = seq % 4;
    if (mod === 0) return "preparing";
    if (mod === 1) return "out_for_delivery";
    if (mod === 2) return "delivered";
    return "confirmed";
  }
  return "confirmed";
}

function paymentForStatus(status, seq) {
  if (status === "cancelled") {
    return seq % 2 === 0 ? "refunded" : "paid";
  }
  return "paid";
}

function getDateRange() {
  const dates = [];
  for (let offset = -5; offset <= 5; offset++) {
    dates.push(formatDate(addDays(new Date(), offset)));
  }
  return dates;
}

async function ensureSlots(query, dates) {
  for (const date of dates) {
    for (const w of DELIVERY_WINDOWS) {
      await query.ensureSlot(date, w.start, w.end);
    }
  }
}

async function upsertCustomers(query) {
  const customerIds = new Map();
  for (const c of CUSTOMERS) {
    const id = await query.upsertCustomer(c);
    customerIds.set(c.phone, id);
  }
  return customerIds;
}

async function seedOrders(query, products, dates) {
  const today = formatDate(new Date());
  const customerIds = await upsertCustomers(query);
  await ensureSlots(query, dates);

  let orderSeq = 1;
  let totalOrders = 0;

  for (const deliveryDate of dates) {
    const ordersThisDay = 2 + (orderSeq % 3);

    for (let i = 0; i < ordersThisDay; i++) {
      const customer = CUSTOMERS[(orderSeq + i) % CUSTOMERS.length];
      const address = ADDRESSES[(orderSeq + i) % ADDRESSES.length];
      const window = DELIVERY_WINDOWS[i % DELIVERY_WINDOWS.length];
      const status = statusForDate(deliveryDate, today, orderSeq);
      const paymentStatus = paymentForStatus(status, orderSeq);

      const slot = await query.getSlot(deliveryDate, window.start, window.end);
      const product = products[(orderSeq + i) % products.length];
      const qty = 1 + ((orderSeq + i) % 2);
      const discountPct = product.discount_percent ?? 0;
      const unitPrice = Math.round(product.price_inr * (1 - discountPct / 100));
      const subtotal = unitPrice * qty;
      const fee = deliveryFee(address.distance_km);
      const total = subtotal + fee;

      const placedAt = addDays(new Date(`${deliveryDate}T12:00:00`), -1);
      placedAt.setHours(9 + (orderSeq % 10), (orderSeq * 7) % 60, 0, 0);

      const orderNumber = `SEED-${deliveryDate.replace(/-/g, "")}-${String(orderSeq).padStart(4, "0")}`;
      const cancelled = status === "cancelled";

      const orderId = await query.insertOrder({
        order_number: orderNumber,
        customer_id: customerIds.get(customer.phone),
        customer_name: customer.name,
        phone: customer.phone,
        house: address.house,
        street: address.street,
        landmark: address.landmark,
        pincode: address.pincode,
        delivery_lat: address.lat,
        delivery_lng: address.lng,
        distance_km: address.distance_km,
        delivery_fee_inr: fee,
        subtotal_inr: subtotal,
        discount_inr: 0,
        total_inr: total,
        delivery_date: deliveryDate,
        delivery_window_start: window.start,
        delivery_window_end: window.end,
        delivery_slot_id: slot?.id ?? null,
        payment_status: paymentStatus,
        status,
        cancellation_notes: cancelled
          ? "Customer requested cancellation (seed data)"
          : null,
        cancelled_at: cancelled ? placedAt.toISOString() : null,
        created_at: placedAt.toISOString(),
      });

      await query.insertOrderItem({
        order_id: orderId,
        product_id: product.id,
        quantity: qty,
        unit_price_inr: unitPrice,
        line_total_inr: subtotal,
      });

      if (slot?.id && !cancelled) {
        await query.incrementSlotBooked(slot.id);
      }

      orderSeq++;
      totalOrders++;
    }
  }

  return totalOrders;
}

function createPgQuery(client) {
  return {
    async getProducts() {
      const { rows } = await client.query(
        `SELECT id, title, price_inr, discount_percent
         FROM public.products
         WHERE is_active = true
         ORDER BY title`
      );
      return rows;
    },
    async clearSeedOrders() {
      const { rows } = await client.query(
        `SELECT id FROM public.orders WHERE order_number LIKE 'SEED-%'`
      );
      if (!rows.length) return;
      const ids = rows.map((r) => r.id);
      await client.query(`DELETE FROM public.order_items WHERE order_id = ANY($1)`, [
        ids,
      ]);
      await client.query(`DELETE FROM public.orders WHERE id = ANY($1)`, [ids]);
    },
    async ensureSlot(date, start, end) {
      await client.query(
        `INSERT INTO public.delivery_slots (slot_date, window_start, window_end, max_orders, orders_booked, is_active)
         VALUES ($1::date, $2::time, $3::time, 10, 0, true)
         ON CONFLICT (slot_date, window_start, window_end) DO NOTHING`,
        [date, start, end]
      );
    },
    async upsertCustomer(c) {
      const { rows } = await client.query(
        `INSERT INTO public.customers (name, phone, email)
         VALUES ($1, $2, $3)
         ON CONFLICT (phone) DO UPDATE
           SET name = EXCLUDED.name, email = EXCLUDED.email
         RETURNING id`,
        [c.name, c.phone, c.email]
      );
      return rows[0].id;
    },
    async getSlot(date, start, end) {
      const { rows } = await client.query(
        `SELECT id FROM public.delivery_slots
         WHERE slot_date = $1::date AND window_start = $2::time AND window_end = $3::time
         LIMIT 1`,
        [date, start, end]
      );
      return rows[0] ?? null;
    },
    async insertOrder(order) {
      const { rows } = await client.query(
        `INSERT INTO public.orders (
          order_number, customer_id, customer_name, phone,
          house, street, landmark, pincode,
          delivery_lat, delivery_lng, distance_km,
          delivery_fee_inr, subtotal_inr, discount_inr, total_inr,
          delivery_date, delivery_window_start, delivery_window_end, delivery_slot_id,
          payment_status, status,
          cancellation_notes, cancelled_at,
          created_at
        ) VALUES (
          $1, $2, $3, $4,
          $5, $6, $7, $8,
          $9, $10, $11,
          $12, $13, $14, $15,
          $16::date, $17::time, $18::time, $19,
          $20, $21,
          $22, $23,
          $24
        )
        RETURNING id`,
        [
          order.order_number,
          order.customer_id,
          order.customer_name,
          order.phone,
          order.house,
          order.street,
          order.landmark,
          order.pincode,
          order.delivery_lat,
          order.delivery_lng,
          order.distance_km,
          order.delivery_fee_inr,
          order.subtotal_inr,
          order.discount_inr,
          order.total_inr,
          order.delivery_date,
          order.delivery_window_start,
          order.delivery_window_end,
          order.delivery_slot_id,
          order.payment_status,
          order.status,
          order.cancellation_notes,
          order.cancelled_at,
          order.created_at,
        ]
      );
      return rows[0].id;
    },
    async insertOrderItem(item) {
      await client.query(
        `INSERT INTO public.order_items (order_id, product_id, quantity, unit_price_inr, line_total_inr)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          item.order_id,
          item.product_id,
          item.quantity,
          item.unit_price_inr,
          item.line_total_inr,
        ]
      );
    },
    async incrementSlotBooked(slotId) {
      await client.query(
        `UPDATE public.delivery_slots SET orders_booked = orders_booked + 1 WHERE id = $1`,
        [slotId]
      );
    },
  };
}

function createSupabaseQuery(supabase) {
  return {
    async getProducts() {
      const { data, error } = await supabase
        .from("products")
        .select("id, title, price_inr, discount_percent")
        .eq("is_active", true)
        .order("title");
      if (error) throw error;
      return data ?? [];
    },
    async clearSeedOrders() {
      const { data } = await supabase
        .from("orders")
        .select("id")
        .like("order_number", "SEED-%");
      if (!data?.length) return;
      const ids = data.map((o) => o.id);
      await supabase.from("order_items").delete().in("order_id", ids);
      await supabase.from("orders").delete().in("id", ids);
    },
    async ensureSlot(date, start, end) {
      const { data } = await supabase
        .from("delivery_slots")
        .select("id")
        .eq("slot_date", date)
        .eq("window_start", start)
        .eq("window_end", end)
        .maybeSingle();
      if (data) return;
      const { error } = await supabase.from("delivery_slots").insert({
        slot_date: date,
        window_start: start,
        window_end: end,
        max_orders: 10,
        orders_booked: 0,
        is_active: true,
      });
      if (error) throw error;
    },
    async upsertCustomer(c) {
      const { data, error } = await supabase
        .from("customers")
        .upsert(
          { name: c.name, phone: c.phone, email: c.email },
          { onConflict: "phone" }
        )
        .select("id")
        .single();
      if (error) throw error;
      return data.id;
    },
    async getSlot(date, start, end) {
      const { data, error } = await supabase
        .from("delivery_slots")
        .select("id, orders_booked")
        .eq("slot_date", date)
        .eq("window_start", start)
        .eq("window_end", end)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    async insertOrder(order) {
      const { data, error } = await supabase
        .from("orders")
        .insert(order)
        .select("id")
        .single();
      if (error) throw error;
      return data.id;
    },
    async insertOrderItem(item) {
      const { error } = await supabase.from("order_items").insert(item);
      if (error) throw error;
    },
    async incrementSlotBooked(slotId) {
      const { data, error } = await supabase
        .from("delivery_slots")
        .select("orders_booked")
        .eq("id", slotId)
        .single();
      if (error) throw error;
      await supabase
        .from("delivery_slots")
        .update({ orders_booked: (data.orders_booked ?? 0) + 1 })
        .eq("id", slotId);
    },
  };
}

async function run(query) {
  const dates = getDateRange();
  const products = await query.getProducts();
  if (!products.length) {
    throw new Error("No active products found. Run migrations first.");
  }

  await query.clearSeedOrders();
  const totalOrders = await seedOrders(query, products, dates);
  return { customerCount: CUSTOMERS.length, totalOrders, dates };
}

try {
  let result;

  if (process.env.DATABASE_URL) {
    const client = new pg.Client({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });
    await client.connect();
    try {
      result = await run(createPgQuery(client));
    } finally {
      await client.end();
    }
  } else if (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );
    result = await run(createSupabaseQuery(supabase));
  } else {
    console.error(
      "Set DATABASE_URL or NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY."
    );
    process.exit(1);
  }

  console.log(
    `Seeded ${result.customerCount} customers and ${result.totalOrders} orders.`
  );
  console.log(`Delivery dates: ${result.dates[0]} → ${result.dates.at(-1)}`);
} catch (err) {
  console.error(err);
  process.exit(1);
}
