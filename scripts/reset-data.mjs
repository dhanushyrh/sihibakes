#!/usr/bin/env node
/**
 * Clear transactional / customer data while keeping catalog and shop config.
 *
 * Keeps: products, product_daily_availability, shop_settings, delivery_fee_slabs,
 *        delivery_vendors, coupons, delivery_slots (orders_booked reset to 0)
 *
 * Usage:
 *   npm run db:reset -- --confirm
 */
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
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

const confirmed = process.argv.includes("--confirm");
if (!confirmed) {
  console.error(
    "This permanently deletes orders, customers, enquiries, WhatsApp threads, and related data.\n" +
      "Products and shop settings are kept.\n\n" +
      "Re-run with: npm run db:reset -- --confirm"
  );
  process.exit(1);
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("Set DATABASE_URL in .env.local");
  process.exit(1);
}

const TABLES_TO_CLEAR = [
  "customer_activity_events",
  "customer_activity_profiles",
  "customer_activity_sessions",
  "whatsapp_messages",
  "whatsapp_conversations",
  "whatsapp_message_log",
  "enquiry_items",
  "contact_enquiries",
  "order_items",
  "admin_alerts",
  "orders",
  "customers",
  "phone_otps",
  "phone_verifications",
  "phone_legal_acknowledgements",
  "customer_reviews",
  "expenses",
];

const TABLES_TO_KEEP = [
  "products",
  "product_daily_availability",
  "shop_settings",
  "delivery_fee_slabs",
  "delivery_vendors",
  "coupons",
  "delivery_slots",
];

const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

async function countTable(table) {
  const { rows } = await client.query(`SELECT COUNT(*)::int AS n FROM public.${table}`);
  return rows[0]?.n ?? 0;
}

await client.connect();

console.log("Before reset:");
for (const table of [...TABLES_TO_CLEAR, "product_daily_counts", ...TABLES_TO_KEEP]) {
  try {
    console.log(`  ${table}: ${await countTable(table)}`);
  } catch {
    console.log(`  ${table}: (missing)`);
  }
}

await client.query("BEGIN");

try {
  for (const table of TABLES_TO_CLEAR) {
    const { rowCount } = await client.query(`DELETE FROM public.${table}`);
    console.log(`Deleted ${rowCount ?? 0} from ${table}`);
  }

  await client.query("TRUNCATE public.product_daily_counts");
  console.log("Truncated product_daily_counts");

  const { rowCount: slotsUpdated } = await client.query(
    "UPDATE public.delivery_slots SET orders_booked = 0"
  );
  console.log(`Reset orders_booked on ${slotsUpdated ?? 0} delivery slot(s)`);

  await client.query("COMMIT");
  console.log("\nReset complete.");
} catch (error) {
  await client.query("ROLLBACK");
  console.error("Reset failed — rolled back:", error.message);
  process.exitCode = 1;
}

console.log("\nAfter reset:");
for (const table of [...TABLES_TO_CLEAR, "product_daily_counts", ...TABLES_TO_KEEP]) {
  try {
    console.log(`  ${table}: ${await countTable(table)}`);
  } catch {
    console.log(`  ${table}: (missing)`);
  }
}

await client.end();
