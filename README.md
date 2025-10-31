# RBACDuBuddy

## Getting started

- Ensure Node.js & npm are installed
- Install dependencies: `npm i`
- Start the dev server: `npm run dev`

## Tech stack

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## Overview

This repository is a small CRUD platform scaffolding that demonstrates dynamic model metadata, role-based access control (RBAC) and integration with Supabase for auth, storage and the database. It stores model metadata (models + fields + permissions) in the database and uses Supabase's API (PostgREST) and Row Level Security (RLS) policies to enforce access.

## How to run the app

Prerequisites

- Node.js (v18+) and npm (or bun/pnpm if you prefer).
- A Supabase project. You'll need the project URL and a publishable (anon) key.

Environment variables

Create a `.env` file in the project root (or set OS environment variables) with at least:

- VITE_SUPABASE_URL=https://your-project.supabase.co
- VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-or-publishable-key

Example (PowerShell):

```powershell
$env:VITE_SUPABASE_URL = 'https://your-project.supabase.co';
$env:VITE_SUPABASE_PUBLISHABLE_KEY = 'your-anon-key';
npm i; npm run dev
```

Run commands

- Install deps: npm install
- Start dev server: npm run dev
- Build: npm run build
- Preview production build: npm run preview

Note: The app connects to Supabase using `src/integrations/supabase/client.ts` which reads the Vite env variables above.

## How models are created & published

Short summary

- The app stores model metadata (model definitions and field schemas) in the database tables `models` and `fields`.
- Model creation and editing is handled by the `ModelBuilder` page (`src/pages/ModelBuilder.tsx`). It inserts/updates rows in `models` and `fields` using the Supabase client.
- "Publishing" a model in this codebase currently means the metadata is saved to the DB. The repository includes database migrations (in `supabase/migrations`) that set up RLS policies and the metadata tables.

What ModelBuilder does (concrete contract)

- Input: form with model name, description and a list of fields (name, type, required, default).
- Output: inserts or updates one row in `models` and multiple rows in `fields` associated with the model id.
- Error modes: requires an authenticated user (ModelBuilder calls `supabase.auth.getUser()`); creating/updating will fail if the current user lacks the required role (RLS policies require admin/editor roles for writes).

Publish / enable model for CRUD operations (manual steps)

The UI stores metadata but DOES NOT automatically create a concrete database table for your model's data rows. There are two common approaches to expose a model as a CRUD API:

1) Generic JSON storage (recommended quick-start)

 - Create a single generic table to hold records for all models, e.g. `records` with a JSONB `data` column plus `model_id`:

```sql
CREATE TABLE public.records (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	model_id uuid REFERENCES public.models(id) ON DELETE CASCADE,
	data jsonb NOT NULL,
	created_at timestamptz DEFAULT now(),
	updated_at timestamptz DEFAULT now()
);
```

 - Add RLS policies for `records` similar to the ones in `supabase/migrations/*` and use the `permissions` table to gate create/read/update/delete.

 - Clients can then use PostgREST at `/rest/v1/records` (or the Supabase client) and include filters like `model_id=eq.<model_uuid>` to scope rows to that model.

2) Per-model table (strongly-typed, more setup)

 - Create a physical table for each model (for example `m_<model_name>`), with columns matching the `fields` metadata. This requires running a CREATE TABLE migration when you publish a model. Example:

```sql
CREATE TABLE public.m_products (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	name text,
	price numeric,
	in_stock boolean DEFAULT true,
	created_at timestamptz DEFAULT now()
);
```

 - Add RLS policies and entries in `permissions` for that model to control which roles can perform which operations.

Important note (assumptions)

- The current UI writes only metadata (`models`, `fields`, `permissions`). There is no automatic SQL engine in this repository that creates typed tables for each model. You can implement a background job or Supabase function to create typed tables when a model is published, or use the generic `records` table approach.

## How "file-write" (model/field writes) works

- All writes in the UI go through the Supabase JS client (`src/integrations/supabase/client.ts`).
- Creating/updating a model is performed by `ModelBuilder` which:
	- Calls `supabase.auth.getUser()` to ensure an authenticated user.
	- Inserts/updates a row in `models` and then inserts the field rows into `fields`.
	- On model edit, existing `fields` rows for the model are deleted and re-inserted to reflect the new schema and ordering.

Example (simplified flow from the UI code):

1. supabase.auth.getUser() -> ensures a user is present.
2. If creating: supabase.from('models').insert({ name, description, created_by })
3. supabase.from('fields').insert([...]) for each field (model_id attached).

This is simple and keeps the UI state in sync with the metadata stored in the DB. RLS policies defined in `supabase/migrations/*` enforce role-based write permissions (admins/editors only for creating/updating models and fields).

## How dynamic CRUD endpoints are registered / enforced

High-level

- The project relies on Supabase (PostgREST) to expose RESTful endpoints for database tables automatically. Every table in your Supabase DB is available through the REST API (e.g., `/rest/v1/models`, `/rest/v1/fields`, `/rest/v1/records`).
- RBAC is enforced via Row Level Security (RLS) policies defined in `supabase/migrations/20251031092923_655ea790-3bbb-452d-a521-29f42574e8b8.sql` and additional policies you add.

Registering an endpoint for a model (recommended patterns)

1) Generic records approach

 - Create the `records` table (see example above).
 - Use `model_id` to segregate data for different models.
 - PostgREST will automatically provide these endpoints. Use the `permissions` table to hold per-role CRUD booleans and then write RLS policies that consult `permissions` to allow/disallow operations based on `auth.uid()` and the requesting user's role.

2) Per-model tables

 - Create a typed table per model. PostgREST will immediately expose CRUD endpoints for that table.
 - Add RLS policies and `permissions` rows for the model to control access.

Example SQL snippet to insert permission rows for a model (replace <model_id>):

```sql
INSERT INTO public.permissions (model_id, role, can_create, can_read, can_update, can_delete)
VALUES
	('<model_id>', 'admin', true, true, true, true),
	('<model_id>', 'editor', true, true, true, false),
	('<model_id>', 'viewer', false, true, false, false);
```

RLS example (concept)

 - Policies in the migrations already allow selects on `models` and `fields` to authenticated users and restrict inserts/updates/deletes by checking `public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor')` where appropriate.
 - For `records` or your per-model tables, add policies that check `public.get_user_role(auth.uid())` or check the `permissions` table to determine whether the current user can perform the action.

## Where to find DB migrations and how to apply them

- Migrations are in `supabase/migrations`. They create the metadata tables and RLS policies used by the app.
- To apply migrations you can use the Supabase CLI (install from https://supabase.com/docs/guides/cli):

```powershell
supabase login
supabase link --project-ref your-project-ref
supabase db push
```

This will create the `profiles`, `user_roles`, `models`, `fields`, `permissions` tables and RLS policies contained in the provided SQL.

## Next steps / recommended improvements

- Implement either an automated publisher function that creates typed tables for each model or adopt the generic `records` table; both approaches have trade-offs (typed tables give better DB-level constraints; JSON records are faster to evolve).
- Add an Admin UI to create/edit `permissions` rows per model (currently the `Settings` page handles user roles but not per-model permission editing).
- Add a background Supabase Function (Edge Function) or a server-side job to run CREATE TABLE SQL when a model is "published".

## Files of interest

- `src/pages/ModelBuilder.tsx` — UI + logic that writes `models` and `fields` via Supabase.
- `src/pages/ModelManager.tsx` — list, edit and delete models.
- `src/pages/AdminPanel.tsx` — dynamic admin UI scaffold (data management coming soon).
- `supabase/migrations/20251031092923_655ea790-3bbb-452d-a521-29f42574e8b8.sql` — DB schema and RLS policies.
- `src/integrations/supabase/client.ts` — Supabase client instance and env vars.

## Completion

This README explains how to run the app, how model metadata is created, how writes are performed and the recommended approaches for registering dynamic CRUD endpoints. If you'd like, I can:

- Add a small Supabase Edge Function that automatically creates a typed table for a model when you click "Publish" in the UI.
- Add a `records` table migration and example RLS policies and wire a minimal data CRUD UI so models are immediately usable.

Tell me which option you prefer and I can implement it next.