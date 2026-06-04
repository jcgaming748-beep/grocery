# Grocery Tracker (Web PWA)

Track grocery spending in your browser with barcode scanning and local storage. No App Store, no Mac, no Apple Developer fee.

Built with **React + Vite + TypeScript**. Data stays on your device via **IndexedDB**.

## Features

- **Trips** — log each shopping trip with a running total
- **Barcode scan** — camera + Open Food Facts lookup, with local product cache
- **Quick add** — type or use **keyboard dictation** (iPhone mic on keyboard): `add 2 milk at 3.49`
- **Manual entry** — name, quantity, price
- **PWA** — Add to Home Screen on iPhone for an app-like experience
- **Offline** — works without network after first load (barcode lookup needs internet)

## Prerequisites

- [Node.js LTS](https://nodejs.org/)

## Development (Windows)

```bash
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

> Camera access requires **HTTPS** on a phone. For local phone testing, deploy to a free host (below) or use a tunnel.

## Build for production

```bash
npm run build
npm run preview
```

Output is in `dist/`.

## Use on your iPhone

1. Deploy `dist/` to a free host:
   - [Vercel](https://vercel.com) — connect GitHub repo, auto-deploys
   - [Netlify](https://netlify.com) — drag-and-drop `dist/` folder
   - [Cloudflare Pages](https://pages.cloudflare.com)

2. Open the **HTTPS** URL in **Safari** on your iPhone

3. **Share → Add to Home Screen**

4. Allow **camera** permission when scanning barcodes

### Quick add with dictation (iPhone)

1. Go to **Shop** tab
2. Tap the quick-add text field
3. Tap the **mic on the iOS keyboard**
4. Say: "add 2 milk at 3.49"
5. Tap **Add**

## Project structure

```
src/
  db/              IndexedDB (Dexie) schema + repositories
  services/        Open Food Facts lookup, text command parser
  components/      Barcode scanner, line items, summary card
  pages/           Home, Shop, Trip detail
  hooks/           useActiveTrip
public/
  icon.svg         PWA icon
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
- All trip and product data is stored locally in your browser on that device.
