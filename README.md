# Grocery Tracker (Web PWA)

Track grocery spending in your browser with barcode scanning, cloud backup, and offline support. No App Store, no Mac, no Apple Developer fee.

Built with **React + Vite + TypeScript**. Data syncs to **Supabase** and is cached locally in **IndexedDB** for offline use.

## Features

- **Trips** — log each shopping trip with a running total
- **Grocery list** — plan before the store with product autocomplete
- **Shop** — accept receipt total (wife-friendly) or scan barcodes (optional)
- **Review** — confirm line items against the receipt at home
- **Cloud backup** — Supabase Postgres + Storage for trips, catalog, and product photos
- **Offline-first** — works without network; syncs when back online
- **Barcode scan** — camera + Open Food Facts lookup, with local product cache
- **Quick add** — type or use **keyboard dictation** (iPhone mic on keyboard): `add 2 milk at 3.49`
- **PWA** — Add to Home Screen on iPhone for an app-like experience

## Prerequisites

- [Node.js LTS](https://nodejs.org/)
- [Supabase](https://supabase.com) account (free tier)

## Supabase setup

1. Create a new Supabase project at [supabase.com](https://supabase.com).

2. In the **SQL Editor**, run these files in order:
   - [`supabase/migrations/001_initial.sql`](supabase/migrations/001_initial.sql) — tables + RLS
   - [`supabase/migrations/002_storage.sql`](supabase/migrations/002_storage.sql) — product photo bucket

3. In **Authentication → Providers**, enable **Email** sign-in.

4. Copy your project **URL** and **anon public key** from **Project Settings → API**.

5. Create `.env` from the example:

```bash
cp .env.example .env
```

Fill in:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

6. Add the same variables in **Vercel → Project → Settings → Environment Variables**, then redeploy.

## Shared household account

Create **one account** (email + password) and sign in on both phones with the same credentials. All trips and product photos sync to that account.

On first sign-in, if you already have local data on the device, you'll be prompted to **back it up to the cloud**.

## Development (Windows)

```bash
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

> Camera access requires **HTTPS** on a phone. For local phone testing, deploy to Vercel or use a tunnel.

## Build for production

```bash
npm run build
npm run preview
```

Output is in `dist/`.

## Use on your iPhone

1. Deploy to [Vercel](https://vercel.com) with Supabase env vars set.

2. Open the **HTTPS** URL in **Safari** on your iPhone.

3. **Share → Add to Home Screen**

4. Sign in with your shared account.

5. Allow **camera** permission when scanning barcodes.

### Quick add with dictation (iPhone)

1. Go to **Shop** tab → expand scan tools
2. Tap the quick-add text field
3. Tap the **mic on the iOS keyboard**
4. Say: "add 2 milk at 3.49"
5. Tap **Add**

## Project structure

```
src/
  db/              IndexedDB (Dexie) schema + repositories
  sync/            Offline-first Supabase sync engine
  lib/             Supabase client
  contexts/        Auth session
  services/        Open Food Facts lookup, text command parser
  components/      Barcode scanner, line items, sync badge
  pages/           Home, List, Shop, Review, Login
  hooks/           Planning list, shopping trip, trip review
supabase/
  migrations/      SQL for Postgres + Storage
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Local dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |

## Notes

- Voice recognition API is not used (unsupported on iPhone Safari). Use keyboard dictation instead.
- Barcode lookup calls Open Food Facts over the network.
- Local IndexedDB is a cache; Supabase is the durable backup when signed in.
- Sync status appears on the Trips tab: Synced / Syncing / Offline.
