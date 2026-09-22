import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Climate TRACE released preliminary global GHG emissions through June 2026.
// First-half 2026 year-to-date estimate: 29.7 billion tonnes CO2e.
// We use that observed estimate as the latest baseline and extrapolate it
// forward using the average H1 2026 daily rate. This is an estimate, not
// a direct second-by-second measurement.
const H1_2026_TONNES = 29_700_000_000;
const H1_DAYS = 181; // Jan 1 through Jun 30, 2026
const DATA_AS_OF = "2026-06-30";
const TONNES_PER_SECOND = H1_2026_TONNES / (H1_DAYS * 24 * 60 * 60);

export async function GET() {
  const dataAsOf = new Date(`${DATA_AS_OF}T00:00:00Z`);
  const now = new Date();
  const secondsSinceBaseline = Math.max(0, (now.getTime() - dataAsOf.getTime()) / 1000);
  const currentTonnes = H1_2026_TONNES + secondsSinceBaseline * TONNES_PER_SECOND;

  return NextResponse.json({
    source: "Climate TRACE",
    metric: "global greenhouse gas emissions",
    unit: "tonnes CO2e",
    currentTonnes,
    tonnesPerSecond: TONNES_PER_SECOND,
    ytdBaselineTonnes: H1_2026_TONNES,
    dataAsOf: DATA_AS_OF,
    release: "Climate TRACE V5.10.0",
    methodology: "H1 2026 Climate TRACE YTD estimate extrapolated using its average H1 daily rate",
    directRealtimeMeasurement: false,
  }, {
    status: 200,
    headers: { "Cache-Control": "no-store" },
  });
}
