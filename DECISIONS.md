# Product Decisions

## DP1 — The Nudge

We chose to **inform and encourage** the user when the weekly target is crossed rather than shame or block them. The tracker should remain useful after a target is exceeded, so the user can continue logging and use the information to make lower-emission choices. The message is intentionally non-judgmental.

## DP2 — Absurd Input

We chose a **warning-and-check** approach for obviously unusual values such as a 500,000 km car trip. The app asks the user to verify the value instead of silently accepting a likely mistake or permanently blocking unusual legitimate entries. This preserves user control while reducing accidental data errors.

## DP3 — The Week

We define a week as **Monday through Sunday**. The dashboard always shows the exact current week range and daily progress, so a user joining mid-week can immediately see how much of the weekly target has already been used.
