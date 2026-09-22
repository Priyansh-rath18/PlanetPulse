# CarbonPulse — Carbon Footprint Tracker

## Hackathon ID
**REPLACE_WITH_YOUR_HACKATHON_ID**

> Important: replace the value above with the exact Hackathon ID shown on your Team page before submission.

## Track
Climate Tech

## Features
- Log an activity with type, quantity, date, and automatic CO₂ calculation.
- Fixed emission factors from the problem statement.
- Dashboard with total weekly footprint and category breakdown.
- Weekly CO₂ target with progress and exceeded-target nudge.
- Activity history with type and date filters.
- No authentication — the app is immediately accessible to graders.
- Local persistence with browser `localStorage`.
- Live-style global carbon pulse (clearly labeled as an estimate, not direct measurement).

## CO₂ Factors

| Activity | Factor |
|---|---:|
| Car travel | 0.20 kg/km |
| Bus travel | 0.08 kg/km |
| Flight | 0.25 kg/km |
| Electricity | 0.80 kg/kWh |
| Veg meal | 0.50 kg/meal |
| Non-veg meal | 2.00 kg/meal |

Formula: `CO₂ = quantity × factor`

## Product decisions
See `DECISIONS.md`.

## Tech Stack
- Next.js
- React
- TypeScript
- CSS
- Lucide React icons
- Browser localStorage

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Test credentials
No credentials required. Authentication is intentionally not implemented, as required by the hackathon brief.

## Standard API
**REPLACE_WITH_YES_OR_NO**

Update this line based on whether your submission implements the hackathon's standard API for this track.
