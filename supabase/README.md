# Supabase Setup

## Prerequisites

- [Supabase CLI](https://supabase.com/docs/guides/cli) installed (`npm install -g supabase`)
- A Supabase project created at [supabase.com](https://supabase.com) (or a local instance via `supabase start`)

---

## 1. Configure environment variables

Copy `.env.example` to `.env.local` and fill in your project credentials:

```bash
cp .env.example .env.local
```

```
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

Both values are available in your Supabase project under **Settings → API**.

---

## 2. Apply migrations

### Option A — Supabase CLI (recommended)

Link your project and push migrations:

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

### Option B — Supabase Dashboard SQL editor

Open **SQL Editor** in your Supabase dashboard and run the contents of:

```
supabase/migrations/001_initial_schema.sql
```

---

## 3. Run the seed script

The seed script inserts all mock records (members, children, program slots, child events, member activities, and Timhert activities). It is **idempotent** — running it multiple times will not create duplicate rows (`INSERT ... ON CONFLICT DO NOTHING`).

### Option A — Supabase CLI

```bash
supabase db reset --linked   # applies migrations + seed in one step
```

Or apply the seed independently after migrations are already in place:

```bash
psql "$DATABASE_URL" -f supabase/seed.sql
```

Replace `$DATABASE_URL` with your project's direct connection string (found under **Settings → Database → Connection string → URI**).

### Option B — Supabase Dashboard SQL editor

Open **SQL Editor** and run the contents of:

```
supabase/seed.sql
```

---

## 4. Local development with demo mode

To run the app without a live Supabase project, set:

```
VITE_DEMO_MODE=true
```

In demo mode the app uses the preset-user card login flow and falls back to in-memory/localStorage data — no Supabase connection is required.

---

## File reference

| File | Purpose |
|---|---|
| `supabase/migrations/001_initial_schema.sql` | Creates all tables, constraints, RLS policies |
| `supabase/seed.sql` | Inserts mock data for local development / bootstrapping |
| `.env.example` | Template for required environment variables |
