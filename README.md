# 🌱 CarbonPulse — Carbon Footprint Tracker

A personal climate dashboard that turns everyday choices into a clear, visible carbon footprint — log an activity, see your weekly progress, build streaks, and earn badges for staying under budget.

**Live app:** https://planet-pulse-tau.vercel.app/

## Hackathon ID
**AZIS-2ABMQH**

## Track
Climate Tech

---

## The 5 Required Features

| # | Feature | Where |
|---|---|---|
| 1 | **Log an activity** — type, quantity, date, with a real-time CO₂ preview | "Log activity" button (top right) |
| 2 | **CO₂ calculation** — fixed emission factors, `CO₂ = quantity × factor` | Shown live in the log-activity modal |
| 3 | **Dashboard** — total footprint + per-category breakdown (chart) | "This Week" stat, "Breakdown" panel, "Week in View" chart |
| 4 | **Weekly target** — set a budget, see progress, get flagged when exceeded | "Weekly Target" panel, with a non-judgmental nudge on overage |
| 5 | **History & filter** — full activity log, filterable by type and date range | "Activity Log" section at the bottom |

### CO₂ Factors

| Activity | Factor |
|---|---:|
| Car travel | 0.20 kg/km |
| Bus travel | 0.08 kg/km |
| Flight | 0.25 kg/km |
| Electricity | 0.80 kg/kWh |
| Veg meal | 0.50 kg/meal |
| Non-veg meal | 2.00 kg/meal |
| Motorcycle / Bike | 0.16 kg/km |
| Auto Rickshaw | 0.35 kg/km |
| Truck | 0.05 kg/tonne-km |

---

## Beyond the brief

Built on top of the required features, all reading the same underlying data (no parallel systems):

- **Daily streaks** — consecutive days under `weekly target ÷ 7` build a streak; one day over budget breaks it immediately.
- **Achievement badges** — 6 milestone badges (First Step → Eco Legend) plus a dynamic Monthly Guardian badge per completed calendar month, with unlock animations and a permanent, non-duplicating record.
- **Social sharing** — every badge generates a shareable achievement card (canvas-rendered) with WhatsApp/X/LinkedIn share links and an opt-in display name.
- **Carbon Discoveries** — an auto-rotating widget surfacing 22 sourced climate facts (IEA, FAO, UNEP, NOAA, EPA, Our World in Data, IRENA), shuffled with no repeats until the full pool has been shown.
- **Personal carbon budget builder** — "Build my budget" turns a short lifestyle questionnaire into a calculated weekly target.
- **Live global emissions counter** — a continuously-extrapolated global GHG estimate for context (Climate TRACE), clearly labeled as an estimate.

---

## Decision Points
See [DECISIONS.md](./DECISIONS.md) for the full reasoning. Summary:

- **DP1 (The Nudge):** Inform and encourage on overage — never shame or block.
- **DP2 (Absurd Input):** Warn and ask the user to confirm, rather than silently accept or hard-block.
- **DP3 (The Week):** Monday–Sunday, with the exact current range always shown so mid-week progress is clear.

---

## Tech Stack
- Next.js 15 (App Router)
- React 19 + TypeScript
- Plain CSS (design tokens, no UI framework)
- Lucide React icons
- Browser `localStorage` for persistence — no backend/database

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Test credentials
None required — authentication is intentionally **not implemented**, per the hackathon brief. Every feature is reachable immediately, with no account.

## Standard API
**No.** This submission has no server-side data API — all state lives in the browser (`localStorage`), and the only server route (`/api/global-emissions`) is a public-data proxy unrelated to grading. Please grade via a **browser agent driving the UI**.

## Demo recording
_Add the 3–4 minute walkthrough link here before submitting._
