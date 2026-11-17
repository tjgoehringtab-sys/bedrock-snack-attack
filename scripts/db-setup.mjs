#!/usr/bin/env node
/**
 * Database setup: runs pending migrations, then syncs the staff roster.
 *
 *   npm run db:setup
 *
 * Safe to run any number of times (it runs automatically on every `npm start`):
 *  - Each migration in /migrations runs once, tracked in schema_migrations.
 *  - Staff from config/staff.mjs are inserted or updated, except people an
 *    organizer edited in /admin (managed_by_admin = true).
 *  - Snack requests and purchased checkmarks are never modified.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import pg from "pg";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
loadDotEnv(path.join(root, ".env"));

const url = process.env.DATABASE_URL;
if (!url) {
  console.error(
    "\n✋ DATABASE_URL is not set.\n" +
      "   Locally: copy .env.example to .env and fill it in.\n" +
      "   On Railway: add a DATABASE_URL variable that references your Postgres service.\n",
  );
  process.exit(1);
}

const ssl = process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined;
const client = new pg.Client({ connectionString: url, ssl, connectionTimeoutMillis: 15000 });
const LOCK_ID = 727274; // any constant; prevents two deploys migrating at once

try {
  await client.connect();
  await client.query("SELECT pg_advisory_lock($1)", [LOCK_ID]);

  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);

  const dir = path.join(root, "migrations");
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
  const { rows } = await client.query("SELECT name FROM schema_migrations");
  const applied = new Set(rows.map((r) => r.name));

  let ran = 0;
  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = fs.readFileSync(path.join(dir, file), "utf8");
    await client.query("BEGIN");
    try {
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [file]);
      await client.query("COMMIT");
      console.log(`  ✓ migration ${file}`);
      ran++;
    } catch (err) {
      await client.query("ROLLBACK");
      throw new Error(`Migration ${file} failed: ${err.message}`);
    }
  }
  console.log(ran ? `🍿 Ran ${ran} migration(s).` : "🍿 Database schema is up to date.");

  const { staff } = await import(pathToFileURL(path.join(root, "config", "staff.mjs")).href);
  validateRoster(staff);

  let added = 0;
  let updated = 0;
  let skipped = 0;
  for (const [i, s] of staff.entries()) {
    const res = await client.query(
      `INSERT INTO staff (id, first_name, last_name, photo, sort_order)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE
         SET first_name = EXCLUDED.first_name,
             last_name  = EXCLUDED.last_name,
             photo      = EXCLUDED.photo,
             sort_order = EXCLUDED.sort_order,
             updated_at = now()
       WHERE staff.managed_by_admin = FALSE
       RETURNING (xmax = 0) AS inserted`,
      [s.id, s.firstName.trim(), (s.lastName ?? "").trim(), s.photo ?? null, (i + 1) * 10],
    );
    if (res.rowCount === 0) skipped++;
    else if (res.rows[0].inserted) added++;
    else updated++;
  }
  console.log(
    `👥 Staff roster synced: ${added} added, ${updated} refreshed` +
      (skipped ? `, ${skipped} kept as edited in /admin` : "") +
      ".",
  );
} catch (err) {
  console.error("\n💥 Database setup failed:", err.message, "\n");
  process.exitCode = 1;
} finally {
  try {
    await client.query("SELECT pg_advisory_unlock($1)", [LOCK_ID]);
  } catch {}
  await client.end().catch(() => {});
}

function validateRoster(staff) {
  if (!Array.isArray(staff)) throw new Error("config/staff.mjs must export an array named `staff`.");
  const seen = new Set();
  for (const s of staff) {
    if (!s || typeof s.id !== "string" || !/^[a-z0-9][a-z0-9-]{0,62}$/.test(s.id)) {
      throw new Error(`Bad staff id ${JSON.stringify(s?.id)} — use lowercase letters, numbers and dashes.`);
    }
    if (seen.has(s.id)) throw new Error(`Duplicate staff id "${s.id}" in config/staff.mjs.`);
    seen.add(s.id);
    if (typeof s.firstName !== "string" || !s.firstName.trim()) throw new Error(`Staff "${s.id}" needs a firstName.`);
    if (s.photo != null && !/^\/staff\/[A-Za-z0-9._-]+\.(webp|jpe?g|png)$/i.test(s.photo)) {
      throw new Error(`Staff "${s.id}" photo must look like "/staff/name.jpg" (a file in public/staff) or null.`);
    }
    if (s.photo && !fs.existsSync(path.join(root, "public", s.photo))) {
      console.warn(`  ⚠ ${s.id}: ${s.photo} not found in public/ — they'll show initials until it's added.`);
    }
  }
}

/** Minimal .env loader so `npm run db:setup` works locally without extra packages. */
function loadDotEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m || process.env[m[1]] !== undefined) continue;
    let v = m[2];
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    process.env[m[1]] = v;
  }
}
