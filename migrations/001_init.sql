-- Bedrock Snack Attack: initial schema.
-- Migrations only ever ADD things. Never put DROP/TRUNCATE in a migration
-- unless you truly mean to erase retreat data.

CREATE TABLE IF NOT EXISTS staff (
  id               TEXT PRIMARY KEY,
  first_name       TEXT NOT NULL,
  last_name        TEXT NOT NULL DEFAULT '',
  photo            TEXT,
  sort_order       INTEGER NOT NULL DEFAULT 0,
  active           BOOLEAN NOT NULL DEFAULT TRUE,
  -- TRUE once an organizer edits this person in /admin; config/staff.mjs
  -- then stops overwriting them on deploy.
  managed_by_admin BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS snack_requests (
  id          BIGSERIAL PRIMARY KEY,
  staff_id    TEXT NOT NULL REFERENCES staff(id) ON DELETE RESTRICT,
  category    TEXT NOT NULL,
  item        TEXT NOT NULL,
  -- normalized item name; requests with the same key combine on the shopping list
  item_key    TEXT NOT NULL,
  details     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS snack_requests_created_idx ON snack_requests (created_at DESC);
CREATE INDEX IF NOT EXISTS snack_requests_item_key_idx ON snack_requests (item_key);
CREATE INDEX IF NOT EXISTS snack_requests_staff_idx ON snack_requests (staff_id);

-- One row per combined shopping-list item that has been bought.
CREATE TABLE IF NOT EXISTS purchased_items (
  item_key      TEXT PRIMARY KEY,
  purchased_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
