# Russel & Ivy · Laman Pertunangan (Burgundy · Cream · Matcha)

A scroll-driven, interactive engagement-ceremony microsite adapted from the
"Ring Journey" demo. Theme: **Burgundy, Cream & Matcha**. Ceremony: **12 December 2026,
2:00–5:00 PM · the bride's family home**.

Built around scroll-driven storytelling, section-specific CSS background designs,
and a drag-to-spin 3D ring (Three.js).

## Run it

Serve the site with the bundled static server:

```bash
node server.js
# → http://localhost:8080
```

(or `PORT=3000 node server.js` for a different port)

## What's inside

| Path | What it is |
|------|-----------|
| `index.html` | Main page — the scroll "journey" (welcome, programme, attire, food, RSVP…) |
| `v2.css` / `v2.js` | Core styles and app logic (CSS scene designs, loader, countdown, forms, confetti) |
| `ring3d.js` | Three.js 3D ring (drag to spin, per-station lighting) |
| `ringdata.js` | The ring 3D model (base64 GLB) |
| `scenedata.js` | Lighting keyframes per scroll position |
| `vendor/` | Three.js r137 + RoomEnvironment + GLTFLoader (local, no CDN) |
| `bilder/` | Social preview image (og-preview) |
| `server.js` | Zero-dependency static server with Range support |

## Notes

- **Forms** are wired to empty endpoints (`SHEET_ENDPOINT = ""` in `v2.js`), so
  they run in a friendly "demo, not connected" mode. To connect a real Google
  Sheet, set `SHEET_ENDPOINT` to your Google Apps Script Web App URL.
- **Fonts** (Anton, Archivo, Caveat, Great Vibes) are still loaded from Google
  Fonts via `v2.css`; everything else is local.
- The engagement date / text lives in `index.html` and `WEDDING_DATE` at the top of
  `v2.js` — easy to change.
- The couple's names ("Russel & Ivy") and the "R&I" monogram live in `index.html`
  (title, hero, footer and the wax-seal loader) — easy to change there.
