# CronCraft

> **Interactive visual cron expression builder & next-run predictor** — built with Vite + React + TypeScript. Zero runtime dependencies.

[![CI](https://github.com/yourusername/croncraft/actions/workflows/ci.yml/badge.svg)](https://github.com/yourusername/croncraft/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## ✨ Features

- 🔡 **Live cron input** with instant parse feedback
- 🧠 **Human-readable explanations** ("Runs every 5 minutes")
- 🕐 **Next 5 scheduled run times** with relative countdown
- 🎛 **Interactive field editors** synced two-way with the raw expression
- 🚀 **Quick presets** (Every 5 mins, Weekdays at 9 AM, 1st of month, etc.)
- 📋 **One-click copy** to clipboard
- ✅ Supports `*`, ranges (`1-5`), steps (`*/15`), lists (`1,15,30`), and named shortcuts (`@daily`, `@weekly`, month/weekday names)
- 🌙 Dark mode UI — zero external CSS frameworks

---

## 🚀 Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) ≥ 18
- npm (comes with Node.js)

### Local Development

```bash
# Clone the repository
git clone https://github.com/yourusername/croncraft.git
cd croncraft

# Install dependencies (dev only — zero runtime deps!)
npm install

# Start the dev server
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 📦 Build for Production

```bash
npm run build
```

Output is in `dist/`. Every asset is relative-pathed (`base: './'`) so the build works from any subdirectory or when opened as a file.

### Preview the Production Build

```bash
npm run preview
```

---

## 🧪 Running Tests

```bash
npm test
```

Tests use [Vitest](https://vitest.dev/) and cover:

| Category | Cases |
|---|---|
| Valid expressions | `*`, `*/n`, `a-b`, `a-b/n`, `a,b,c`, named months/days, `@daily` etc. |
| Invalid expressions | Too few/many fields, out-of-range values, bad ranges, step=0 |
| Human summaries | Verifies plain-English output for key expressions |
| Next-run times | 5-min spacing, strict ordering, month/year boundary rollovers, leap year Feb 29, skipped invalid days (Feb 30) |

---

## 🌐 Deploy to GitHub Pages

1. Update `base` in `vite.config.ts` to match your repo name:
   ```ts
   base: '/croncraft/',
   ```
2. Push to GitHub and enable **Pages → Deploy from branch** (`gh-pages`) or use the [gh-pages](https://www.npmjs.com/package/gh-pages) package:
   ```bash
   npm install --save-dev gh-pages
   npm run build && npx gh-pages -d dist
   ```

## 🌐 Deploy to Vercel

Click the button or run:

```bash
npx vercel --prod
```

Vercel auto-detects Vite and sets the output directory to `dist`.

---

## 📐 Project Structure

```
croncraft/
├── src/
│   ├── lib/
│   │   ├── cron.ts          # Pure TS cron parser, human-readable, next-run engine
│   │   └── cron.test.ts     # Vitest unit tests
│   ├── App.tsx              # Main React UI
│   ├── main.tsx             # React entry point
│   └── index.css            # Dark-mode styles (no framework)
├── .github/workflows/ci.yml  # GitHub Actions: type-check → test → build
├── index.html
├── vite.config.ts
├── tsconfig.json
└── package.json
```

---

## 🔢 Cron Expression Reference

```
┌───────────── minute        (0 - 59)
│ ┌─────────── hour          (0 - 23)
│ │ ┌───────── day of month  (1 - 31)
│ │ │ ┌─────── month         (1 - 12  or  jan-dec)
│ │ │ │ ┌───── day of week   (0 - 6   or  sun-sat, 0 = Sunday)
│ │ │ │ │
* * * * *
```

| Field | Allowed Values | Special Characters |
|---|---|---|
| Minute | 0–59 | `*` `/` `,` `-` |
| Hour | 0–23 | `*` `/` `,` `-` |
| Day of Month | 1–31 | `*` `/` `,` `-` |
| Month | 1–12 / jan–dec | `*` `/` `,` `-` |
| Day of Week | 0–6 / sun–sat | `*` `/` `,` `-` |

### Named Shortcuts

| Shortcut | Equivalent |
|---|---|
| `@yearly` / `@annually` | `0 0 1 1 *` |
| `@monthly` | `0 0 1 * *` |
| `@weekly` | `0 0 * * 0` |
| `@daily` / `@midnight` | `0 0 * * *` |
| `@hourly` | `0 * * * *` |

---

## 🤝 Contributing

Contributions are welcome! Here are some **Good First Issues** to get started:

- 🕐 Add a 6th field for seconds (`0-59`) as an optional toggle
- 🌐 Add a timezone selector (display next runs in a chosen zone)
- 📊 Show a mini calendar heatmap of when the cron fires this month
- 🔗 Generate a shareable URL with the expression encoded in the hash
- ♿ Improve screen-reader announcements for live parse results
- 🌍 i18n: add human-readable output in other languages

### Development Workflow

```bash
git checkout -b feat/my-feature
# make changes
npm test          # all tests must pass
npm run build     # build must succeed
npm run lint      # zero TypeScript errors
git commit -m "feat: describe your change"
git push origin feat/my-feature
# open a Pull Request
```

Please follow [Conventional Commits](https://www.conventionalcommits.org/) for commit messages.

---

## 📄 License

MIT © [Your Name](https://github.com/yourusername)
