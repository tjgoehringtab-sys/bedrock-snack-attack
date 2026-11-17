# Bedrock Snack Attack 🍿

Snack requests for the Bedrock Church Sarasota staff retreat (Jan 3–6).
Staff tap their photo, request snacks, see what everyone else wants, and whoever does the shopping gets one combined, check-off-able list.

**Stack:** Next.js 16 (App Router, TypeScript) · Tailwind CSS 4 · PostgreSQL (`pg`, plain parameterized SQL) · one Railway service + one Railway Postgres.

---

## What's inside

| Page | What it does |
|---|---|
| `/` | Big title + staff photo grid. Tap your face. The phone remembers you (only your choice is stored on the phone). |
| `/snacks` **My Snacks** | Pick a category, tap a suggestion or type anything, add an optional note, tap **Add to Snack Attack**. Your requests are listed below with a remove button. |
| `/wall` **Snack Wall** | Everyone's requests with photo, name, item, note and time. View **Latest**, **By person**, or **By category**. Request count per person across the top. Refreshes itself every few seconds. |
| `/shopping` **Shopping List** | Matching requests combined into one line ("Dr Pepper ×3 people: Tronn, Blake, Malia") with every person's notes. Grouped by category. Copy/share as text. Checkmarks are shared with everyone, but only the organizer can change them. |
| `/admin` **Organizer tools** | PIN-protected: remove requests, add/rename/hide staff and change photos, reset the whole list. |

**Permissions are enforced on the server.** Checking items off, removing other people's requests, managing staff, and resetting all require the organizer cookie, which you only get by entering `ORGANIZER_PIN`. Hiding buttons is just cosmetic. Picking your photo is an honor system (it's a church staff retreat, not a bank).

---

## Files you'll actually edit

| File | For |
|---|---|
| `config/staff.mjs` | **The staff roster.** Add, rename, or change photos. |
| `public/staff/` | Staff photos (square-ish `.webp`, `.jpg`, or `.png`). |
| `config/snacks.ts` | Categories, emoji, colors, and the tappable suggestion chips. |
| `config/site.ts` | Title, subtitle, retreat dates, and all the jokes. |

Everything else: `src/app` (pages + API routes), `src/components` (UI), `src/lib` (database, auth, matching), `migrations/` (SQL schema), `scripts/db-setup.mjs` (runs migrations + syncs the roster).

---

## 1. Run it on your computer

You need **Node.js 20.9 or newer** (22 recommended, from nodejs.org) and a PostgreSQL database.

**Getting a database (pick one):**

- **Easiest:** do the Railway steps below first (sections 3–4), then in Railway open the **Postgres** service → **Variables**, copy **`DATABASE_PUBLIC_URL`**, and use that as your local `DATABASE_URL`. (You're then using the real retreat database, so be gentle.)
- **Separate test database with Docker:**
  ```bash
  docker run --name snack-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=snack_attack -p 5432:5432 -d postgres:16
  ```
  Then your `DATABASE_URL` is `postgresql://postgres:postgres@localhost:5432/snack_attack`.

**Then, in a terminal inside this folder:**

```bash
npm install
cp .env.example .env          # Windows: copy .env.example .env
# open .env and set DATABASE_URL and ORGANIZER_PIN
npm run db:setup              # creates tables + loads the staff roster
npm run dev                   # http://localhost:3000
```

To try the production build locally: `npm run build` then `npm start`.

> If you connect to Railway's public database URL and get an SSL error, add `DATABASE_SSL=true` to `.env`.

---

## 2. Put the code on GitHub

1. Go to **github.com → New repository**. Name it `bedrock-snack-attack`, set it to **Private**, and **don't** add a README or .gitignore (this project has them).
2. In a terminal inside this folder:
   ```bash
   git init
   git add .
   git commit -m "Bedrock Snack Attack"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/bedrock-snack-attack.git
   git push -u origin main
   ```
   (Prefer clicking? GitHub Desktop → **Add an Existing Repository** → choose this folder → **Publish repository**.)

`.gitignore` already keeps `node_modules`, build output, and your `.env` (database password + PIN) out of GitHub.

---

## 3. Create the Railway project from GitHub

1. Sign in at **railway.com** (signing in with GitHub is easiest).
2. **New Project → Deploy from GitHub repo →** pick `bedrock-snack-attack`. If you don't see it, click **Configure GitHub App** and give Railway access to that repo.
3. Railway detects Node.js and uses this project's scripts automatically:
   - build: `npm run build`
   - start: `npm start` (runs database setup, then starts the site on Railway's `PORT`)

The first deploy will fail or show the "snack database is out to lunch" page. That's expected until the database is connected in the next two steps.

## 4. Add PostgreSQL

In the project canvas click **+ Create** (or **New**) → **Database → PostgreSQL**. Railway creates a service called **Postgres**.

## 5. Set the environment variables

Click your **app service** (not Postgres) → **Variables** → add:

| Name | Value |
|---|---|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (type it exactly; Railway autocompletes it. If your database service has a different name, use that name instead of `Postgres`.) |
| `ORGANIZER_PIN` | Your organizer PIN. Digits work best on phones; use 6 or more. Only share it with whoever is shopping/organizing. |
| `SESSION_SECRET` | Optional. Any long random string. |

Click **Deploy** (or **Apply changes**) to redeploy with the new variables.

`${{Postgres.DATABASE_URL}}` uses Railway's private network, so the password never leaves Railway and no SSL setting is needed.

## 6. Migrations and the staff roster

Nothing to do by hand: **every start runs `npm run db:setup` automatically.** You'll see this in the app service's **Deploy Logs**:

```
✓ migration 001_init.sql
🍿 Ran 1 migration(s).
👥 Staff roster synced: 10 added, 0 refreshed.
```

To run it yourself anyway (for example from your computer against the Railway DB), put the Postgres service's `DATABASE_PUBLIC_URL` in your local `.env` as `DATABASE_URL` and run `npm run db:setup`. It's safe to run any number of times.

## 7. Get the public URL

App service → **Settings → Networking → Generate Domain**. If it asks for a port, use the one in the Deploy Logs line `- Local: http://localhost:XXXX` (Railway usually picks it automatically). You'll get something like `bedrock-snack-attack-production.up.railway.app`. Text that link to the staff.

**Optional but nice:** App service → **Settings → Deploy → Healthcheck Path** → `/api/health`. Railway then waits for the database connection to work before switching traffic to a new deploy.

**Tip for staff:** on iPhone, open the link in Safari → Share → **Add to Home Screen**. It gets its own popcorn icon.

---

## Your data is safe across deploys

- Pushing new code to GitHub makes Railway rebuild and restart. **Requests, checkmarks, and organizer changes live in Postgres, not in the app**, so they survive every deploy and restart.
- Migrations only ever add things (`CREATE TABLE IF NOT EXISTS`, and each file runs once, tracked in `schema_migrations`).
- The roster sync adds new people and refreshes existing ones from `config/staff.mjs`, **except anyone edited in /admin**; those keep the organizer's version. It never touches requests.
- The only thing that deletes requests is **/admin → Reset** (organizer PIN + typing `SNACKS`), or an organizer removing a single request.

**Need a schema change later?** Add a new file like `migrations/002_whatever.sql`. Never edit or delete `001_init.sql`, and avoid `DROP`/`TRUNCATE`.

---

## Editing staff

**Option A: in the code (permanent, goes in GitHub)**
1. Put the photo in `public/staff/`, e.g. `public/staff/jane-doe.jpg` (square photos look best; ~400×400 is plenty).
2. Add a line to `config/staff.mjs`:
   ```js
   { id: "jane-doe", firstName: "Jane", lastName: "Doe", photo: "/staff/jane-doe.jpg" },
   ```
   No photo yet? Use `photo: null` and she gets a colored initials circle.
3. Commit and push. Railway redeploys and adds her.

Rules: `id` is lowercase-with-dashes and should never change once someone has made requests. Order in the file = order on the home screen.

**Option B: in the app (instant, no code)**
`/admin` → **Staff**: add a person, rename, pick a photo from the files already in `public/staff`, or **Hide** someone. Hidden people disappear from the photo grid but their past requests stay attributed. (Uploading brand-new photos needs Option A, since Railway's disk isn't permanent.)

## Editing the snack suggestions

Open `config/snacks.ts`. Each category has a `presets` list. Add, remove, or reorder chips, change labels, emoji, colors, or quips. You can add new categories too. Don't rename a category's `id` once requests exist (change the `label` instead). Commit, push, done.

Retreat dates and jokes are in `config/site.ts`.

---

## How the Shopping List combines requests

Requests match when their item names are the same after ignoring capitalization, spacing, punctuation, and simple plurals. So "Dr Pepper", "dr. pepper", and "DR PEPPER" become one line, as do "Pretzels"/"pretzel" and "Reese's"/"Reeses". Brand, flavor, and quantity notes are kept separately under the combined line with each person's name, so the shopper sees "Tronn: the real stuff, not diet" and "Malia: 12-pack".

Different products stay separate on purpose ("Dr Pepper" vs "Diet Dr Pepper"). If two lines really are the same thing, the organizer can remove one request in /admin.

---

## Organizer cheat sheet

- **Shopping:** open **Shopping List** → **🔐 Organizer** → enter the PIN. Tap any item to check it off; everyone sees it within seconds. **Copy list** puts the whole list on your clipboard for a text or Notes. **Hide bought** shortens the list in the store.
- **Cleanup:** `/admin` → **Requests** → remove anything inappropriate or duplicated.
- **New retreat:** `/admin` → **Reset** → type `SNACKS`. Clears requests and checkmarks; staff stay.
- Sign-in lasts 30 days on that phone. Changing `ORGANIZER_PIN` in Railway signs everyone out.
- Too many wrong PIN guesses locks that connection out for 10 minutes.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| "The snack database is out to lunch" | `DATABASE_URL` missing or wrong on the **app** service, or Postgres is stopped. Check Variables, then redeploy. |
| Deploy log says `DATABASE_URL is not set` | Same as above. |
| Organizer button says organizer mode is off | Add `ORGANIZER_PIN` to the app service's Variables and redeploy. |
| A new person doesn't show up | Check the Deploy Logs roster line, make sure the `id` is unique, and refresh the phone. |
| Someone's photo shows initials | The `photo` path in `config/staff.mjs` doesn't match a file in `public/staff` (capitalization matters). The deploy log prints a ⚠ warning when this happens. |
| Someone picked the wrong face | Tap **Not you? Switch person** under the name in the top-right. |

---

## Scripts

| Command | Does |
|---|---|
| `npm run dev` | Local dev server with hot reload |
| `npm run build` | Production build (doesn't need the database) |
| `npm start` | Runs `db:setup`, then serves on `$PORT` (Railway's start command) |
| `npm run db:setup` | Migrations + roster sync (safe to repeat) |
| `npm run typecheck` | TypeScript check |

## API (for the curious)

| Method & path | Who |
|---|---|
| `GET /api/staff`, `GET /api/requests`, `GET /api/shopping` | Anyone |
| `POST /api/requests` `{staffId, category, item, details}` | Anyone (honor system) |
| `DELETE /api/requests/:id` | The requester (sends their `staffId`) or organizer |
| `PATCH /api/shopping` `{key, purchased}` | Organizer |
| `POST/DELETE /api/organizer` | PIN sign-in / sign-out |
| `GET/POST /api/admin/staff`, `PATCH /api/admin/staff/:id`, `POST /api/admin/reset` | Organizer |
| `GET /api/health` | Health check |

Staff photos are from mybedrock.church/our-leadership and are stored in this repo, not hotlinked.
