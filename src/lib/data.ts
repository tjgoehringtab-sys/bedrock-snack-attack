import fs from "node:fs/promises";
import path from "node:path";
import { CATEGORIES } from "@config/snacks";
import { query, withTransaction } from "./db";
import { itemKey } from "./normalize";
import type { ShoppingItem, SnackRequest, Staff } from "./types";

/* ---------------- Staff ---------------- */

type StaffRow = {
  id: string;
  first_name: string;
  last_name: string;
  photo: string | null;
  sort_order: number;
  active: boolean;
};

const toStaff = (r: StaffRow): Staff => ({
  id: r.id,
  firstName: r.first_name,
  lastName: r.last_name,
  photo: r.photo,
  sortOrder: r.sort_order,
  active: r.active,
});

export async function getActiveStaff(): Promise<Staff[]> {
  const rows = await query<StaffRow>(
    `SELECT id, first_name, last_name, photo, sort_order, active
       FROM staff WHERE active ORDER BY sort_order, first_name`,
  );
  return rows.map(toStaff);
}

export async function getAllStaff(): Promise<Staff[]> {
  const rows = await query<StaffRow>(
    `SELECT id, first_name, last_name, photo, sort_order, active
       FROM staff ORDER BY active DESC, sort_order, first_name`,
  );
  return rows.map(toStaff);
}

export const PHOTO_PATTERN = /^\/staff\/[A-Za-z0-9._-]+\.(webp|jpe?g|png)$/i;

/** Image files available in public/staff, for the organizer's photo picker. */
export async function listStaffPhotos(): Promise<string[]> {
  try {
    const files = await fs.readdir(path.join(process.cwd(), "public", "staff"));
    return files
      .map((f) => `/staff/${f}`)
      .filter((p) => PHOTO_PATTERN.test(p))
      .sort();
  } catch {
    return [];
  }
}

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 50) || "person"
  );
}

export async function createStaff(input: { firstName: string; lastName: string; photo: string | null }): Promise<Staff> {
  const base = slugify(`${input.firstName} ${input.lastName}`);
  return withTransaction(async (c) => {
    const existing = await c.query<{ id: string }>(`SELECT id FROM staff WHERE id = $1 OR id LIKE $2`, [base, `${base}-%`]);
    const taken = new Set(existing.rows.map((r) => r.id));
    let id = base;
    for (let n = 2; taken.has(id); n++) id = `${base}-${n}`;
    const order = await c.query<{ next: number }>(`SELECT COALESCE(MAX(sort_order), 0) + 10 AS next FROM staff`);
    const res = await c.query<StaffRow>(
      `INSERT INTO staff (id, first_name, last_name, photo, sort_order, managed_by_admin)
       VALUES ($1, $2, $3, $4, $5, TRUE)
       RETURNING id, first_name, last_name, photo, sort_order, active`,
      [id, input.firstName, input.lastName, input.photo, order.rows[0].next],
    );
    return toStaff(res.rows[0]);
  });
}

export async function updateStaff(
  id: string,
  patch: { firstName?: string; lastName?: string; photo?: string | null; active?: boolean },
): Promise<Staff | null> {
  const rows = await query<StaffRow>(
    `UPDATE staff SET
        first_name = COALESCE($2, first_name),
        last_name  = COALESCE($3, last_name),
        photo      = CASE WHEN $4::boolean THEN $5 ELSE photo END,
        active     = COALESCE($6, active),
        managed_by_admin = TRUE,
        updated_at = now()
      WHERE id = $1
      RETURNING id, first_name, last_name, photo, sort_order, active`,
    [
      id,
      patch.firstName ?? null,
      patch.lastName ?? null,
      patch.photo !== undefined,
      patch.photo ?? null,
      patch.active ?? null,
    ],
  );
  return rows[0] ? toStaff(rows[0]) : null;
}

/* ---------------- Requests ---------------- */

type RequestRow = {
  id: string; // BIGSERIAL comes back as string
  staff_id: string;
  first_name: string;
  photo: string | null;
  category: string;
  item: string;
  item_key: string;
  details: string | null;
  created_at: Date;
};

const REQUEST_SELECT = `
  SELECT r.id, r.staff_id, s.first_name, s.photo, r.category, r.item, r.item_key, r.details, r.created_at
    FROM snack_requests r
    JOIN staff s ON s.id = r.staff_id`;

const toRequest = (r: RequestRow): SnackRequest => ({
  id: Number(r.id),
  staffId: r.staff_id,
  firstName: r.first_name,
  photo: r.photo,
  category: r.category,
  item: r.item,
  details: r.details,
  createdAt: new Date(r.created_at).toISOString(),
});

export async function getRequests(): Promise<SnackRequest[]> {
  const rows = await query<RequestRow>(`${REQUEST_SELECT} ORDER BY r.created_at DESC, r.id DESC LIMIT 3000`);
  return rows.map(toRequest);
}

export const MAX_REQUESTS_PER_PERSON = 150;

export type CreateResult =
  | { ok: true; request: SnackRequest; duplicate: boolean }
  | { ok: false; error: string; status: number };

export async function createRequest(input: {
  staffId: string;
  category: string;
  item: string;
  details: string | null;
}): Promise<CreateResult> {
  const key = itemKey(input.item);
  if (!key) return { ok: false, error: "That item needs at least one letter or number.", status: 400 };
  if (!CATEGORIES.some((c) => c.id === input.category)) return { ok: false, error: "Unknown category.", status: 400 };

  return withTransaction(async (c) => {
    // Lock the person's row so double-taps can't race past the checks below.
    const who = await c.query<{ id: string }>(`SELECT id FROM staff WHERE id = $1 AND active FOR UPDATE`, [input.staffId]);
    if (who.rowCount === 0) return { ok: false, error: "We don't recognize that person. Pick your photo again.", status: 400 };

    // Same person, same item, same note within 20 seconds = an accidental double tap.
    const dup = await c.query<RequestRow>(
      `${REQUEST_SELECT}
        WHERE r.staff_id = $1 AND r.item_key = $2 AND COALESCE(r.details, '') = COALESCE($3, '')
          AND r.created_at > now() - interval '20 seconds'
        ORDER BY r.created_at DESC LIMIT 1`,
      [input.staffId, key, input.details],
    );
    if (dup.rows[0]) return { ok: true, request: toRequest(dup.rows[0]), duplicate: true };

    const count = await c.query<{ n: string }>(`SELECT COUNT(*) AS n FROM snack_requests WHERE staff_id = $1`, [input.staffId]);
    if (Number(count.rows[0].n) >= MAX_REQUESTS_PER_PERSON) {
      return { ok: false, error: `That's ${MAX_REQUESTS_PER_PERSON} requests. The van is full. Remove a few first.`, status: 429 };
    }

    const ins = await c.query<{ id: string }>(
      `INSERT INTO snack_requests (staff_id, category, item, item_key, details)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [input.staffId, input.category, input.item, key, input.details],
    );
    const row = await c.query<RequestRow>(`${REQUEST_SELECT} WHERE r.id = $1`, [ins.rows[0].id]);
    return { ok: true, request: toRequest(row.rows[0]), duplicate: false };
  });
}

/** Staff can remove their own requests (honor system); organizers can remove any. */
export async function deleteRequest(id: number, onlyForStaffId: string | null): Promise<boolean> {
  const rows = onlyForStaffId
    ? await query(`DELETE FROM snack_requests WHERE id = $1 AND staff_id = $2 RETURNING id`, [id, onlyForStaffId])
    : await query(`DELETE FROM snack_requests WHERE id = $1 RETURNING id`, [id]);
  return rows.length > 0;
}

/* ---------------- Shopping list ---------------- */

export async function getShoppingList(): Promise<ShoppingItem[]> {
  const [rows, bought] = await Promise.all([
    query<RequestRow>(`${REQUEST_SELECT} ORDER BY r.created_at ASC, r.id ASC`),
    query<{ item_key: string }>(`SELECT item_key FROM purchased_items`),
  ]);
  const purchased = new Set(bought.map((b) => b.item_key));

  const groups = new Map<string, RequestRow[]>();
  for (const r of rows) {
    const list = groups.get(r.item_key);
    if (list) list.push(r);
    else groups.set(r.item_key, [r]);
  }

  const items: ShoppingItem[] = [];
  for (const [key, list] of groups) {
    items.push({
      key,
      name: mostCommon(list.map((r) => r.item.trim()), (s) => s.toLowerCase()),
      category: mostCommon(list.map((r) => r.category), (s) => s),
      peopleCount: new Set(list.map((r) => r.staff_id)).size,
      requestCount: list.length,
      purchased: purchased.has(key),
      firstRequestedAt: new Date(list[0].created_at).toISOString(),
      requesters: list.map((r) => ({
        requestId: Number(r.id),
        staffId: r.staff_id,
        firstName: r.first_name,
        photo: r.photo,
        details: r.details,
      })),
    });
  }
  return items.sort((a, b) => a.name.localeCompare(b.name));
}

/** Most frequent value (by `norm`); ties go to whichever appeared first. Returns the first spelling seen. */
function mostCommon(values: string[], norm: (s: string) => string): string {
  const counts = new Map<string, { n: number; first: number; original: string }>();
  values.forEach((v, i) => {
    const k = norm(v);
    const c = counts.get(k);
    if (c) c.n++;
    else counts.set(k, { n: 1, first: i, original: v });
  });
  let best: { n: number; first: number; original: string } | null = null;
  for (const c of counts.values()) {
    if (!best || c.n > best.n || (c.n === best.n && c.first < best.first)) best = c;
  }
  return best?.original ?? values[0];
}

export async function setPurchased(key: string, purchased: boolean): Promise<void> {
  if (purchased) {
    await query(`INSERT INTO purchased_items (item_key) VALUES ($1) ON CONFLICT (item_key) DO NOTHING`, [key]);
  } else {
    await query(`DELETE FROM purchased_items WHERE item_key = $1`, [key]);
  }
}

export async function resetRetreat(): Promise<{ requests: number; purchased: number }> {
  return withTransaction(async (c) => {
    const r = await c.query(`DELETE FROM snack_requests`);
    const p = await c.query(`DELETE FROM purchased_items`);
    return { requests: r.rowCount ?? 0, purchased: p.rowCount ?? 0 };
  });
}
