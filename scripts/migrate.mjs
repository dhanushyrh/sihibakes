#!/usr/bin/env node
/**
 * Apply migrations when DATABASE_URL is set.
 * Get it from Supabase Dashboard → Project Settings → Database → Connection string (URI)
 *
 * Usage: DATABASE_URL="postgresql://..." npm run db:migrate
 */
import { readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(__dirname, "../supabase/migrations");

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("Set DATABASE_URL to your Supabase Postgres connection string.");
  process.exit(1);
}

const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

const files = readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

await client.connect();
console.log(`Applying ${files.length} migration(s)...`);

for (const file of files) {
  const sql = readFileSync(join(migrationsDir, file), "utf8");
  console.log(`→ ${file}`);
  await client.query(sql);
}

await client.end();
console.log("Done.");
