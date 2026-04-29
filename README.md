# Hitsanat KFL — Children's Ministry Management System

A full-stack web application for managing the children's ministry of the Ethiopian Orthodox Tewahedo Church (Hitsanat Kifle Fiqir Lealam). Built with React, TypeScript, Tailwind CSS, and Supabase.

---

## Overview

Hitsanat KFL is an internal management system used by department and sub-department leaders to:

- Register and manage ministry members and children
- Track weekly program attendance
- Manage sub-department activities (Timhert, Mezmur, Kinetibeb, Kuttr, Ekd)
- Generate reports and export data
- Provision and manage Supabase Auth login accounts for leaders

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite |
| Styling | Tailwind CSS v4, shadcn/ui (Radix UI) |
| Backend | Supabase (PostgreSQL + Auth + Edge Functions) |
| Charts | Recharts |
| Forms | React Hook Form |
| Testing | Vitest, fast-check (property-based testing) |
| Routing | React Router v7 |
| Date | Ethiopian Calendar support |

---

## Project Structure

```
src/
  app/
    components/       # Shared UI components
    context/          # Auth, DataStore, Theme, Language contexts
    hooks/            # Data hooks (useMembers, useChildren, etc.)
    lib/              # Utilities (permissions, validation, adminApi)
    pages/            # Page components
    routes.tsx        # App routing
supabase/
  functions/          # Deno Edge Functions
  migrations/         # SQL migration files
  seed.sql            # Initial seed data (18 system users)
scripts/
  create-users.mjs    # Script to provision Supabase Auth users
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- A Supabase project

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env.local` and fill in your Supabase credentials:

```env
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY=sb_publishable_<your-key>
VITE_SUPABASE_ANON_KEY=<your-anon-key>
VITE_DEMO_MODE=false
```

### 3. Set up the database

Run the migrations in order in the Supabase SQL Editor:

```
supabase/migrations/deepseek_sql_20260424_7a7bde.sql   # Base schema
supabase/migrations/006b_auth_schema_prerequisites.sql
supabase/migrations/apply_all_functions.sql             # All RPCs and RLS policies
supabase/migrations/008_handle_new_user_upsert.sql      # Upsert guard trigger
```

Then seed the initial 18 system users:

```
supabase/seed.sql
```

### 4. Create auth users

```bash
SUPABASE_SERVICE_ROLE_KEY=your_key node scripts/create-users.mjs
```

### 5. Start the development server

```bash
npm run dev
```

---

## Role-Based Access Control

| Role | Access |
|---|---|
| **Chairperson** (Department) | Full access — create accounts, assign roles, manage all data |
| **Vice Chairperson** (Department) | View all data, reset passwords |
| **Secretary** (Department) | View all data, reset passwords |
| **Sub-dept Chairperson** | Manage their sub-department's data |
| **Sub-dept Vice/Secretary** | View and edit their sub-department's data |

---

## Sub-Departments

- **Timhert** — Academic/education programs
- **Mezmur** — Music and choir
- **Kinetibeb** — Arts and crafts
- **Kuttr** — Children's attendance tracking
- **Ekd** — General activities

---

## Running Tests

```bash
# Run all tests once
npx vitest run

# Run with UI
npx vitest --ui
```

Tests include property-based tests using `fast-check` for validation logic, permission helpers, and data filtering functions.

---

## Demo Mode

Set `VITE_DEMO_MODE=true` in `.env.local` to run the app with in-memory mock data — no Supabase connection required.

---

## License

Internal use only — Ethiopian Orthodox Tewahedo Church, Hitsanat KFL.
