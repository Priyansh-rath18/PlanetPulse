/*
 * Badge engine.
 *
 * Source of truth: the existing `entries` array and `streak` state
 * from app/page.tsx. This module only OBSERVES that state — it never
 * recomputes streaks or daily totals independently.
 */

export type Entry = {
  id: string;
  type: string;
  quantity: number;
  date: string; // YYYY-MM-DD
  emission: number;
};

export type StreakState = {
  current: number;
  startDate: string;
  lastUpdated: string;
};

export type EarnedBadges = Record<string, string>; // badge id -> ISO earnedAt

export type BadgeStatus = {
  id: string;
  emoji: string;
  name: string;
  description: string;
  image: string;
  earned: boolean;
  earnedAt?: string;
  progress?: { current: number; target: number };
};

export type UnlockedBadgeInfo = {
  id: string;
  emoji: string;
  name: string;
  description: string;
  image: string;
  earnedAt: string;
};

type StaticBadgeDef = {
  id: string;
  emoji: string;
  name: string;
  description: string;
  image: string;
  streakTarget?: number; // undefined = "first step" (usage, not streak, based)
};

export const FIRST_STEP: StaticBadgeDef = {
  id: "first_step",
  emoji: "🌱",
  name: "First Step",
  description: "Complete your first day using the app",
  image: "/badges/first-step.png",
};

export const STREAK_BADGES: StaticBadgeDef[] = [
  {
    id: "streak_starter",
    emoji: "🔥",
    name: "Streak Starter",
    description: "Maintain your carbon budget for 1 day",
    image: "/badges/streak-starter.png",
    streakTarget: 1,
  },
  {
    id: "week_warrior",
    emoji: "🌿",
    name: "Week Warrior",
    description: "Maintain your carbon budget for 7 days",
    image: "/badges/week-warrior.png",
    streakTarget: 7,
  },
  {
    id: "ten_day_champion",
    emoji: "🏆",
    name: "Ten-Day Champion",
    description: "Maintain your carbon budget for 10 days",
    image: "/badges/ten-day-champion.png",
    streakTarget: 10,
  },
  {
    id: "eco_vanguard",
    emoji: "⚔️",
    name: "Eco Vanguard",
    description: "Maintain your streak for 50 days",
    image: "/badges/eco-vanguard.png",
    streakTarget: 50,
  },
  {
    id: "eco_legend",
    emoji: "👑",
    name: "Eco Legend",
    description: "Maintain your streak for 100 days",
    image: "/badges/eco-legend.png",
    streakTarget: 100,
  },
];

export const STATIC_BADGES: StaticBadgeDef[] = [
  FIRST_STEP,
  ...STREAK_BADGES,
];

const MONTHLY_GUARDIAN_IMAGE = "/badges/monthly-guardian.png";

function monthKey(year: number, monthIndex0: number): string {
  return `${year}-${String(monthIndex0 + 1).padStart(2, "0")}`;
}

function daysInMonth(year: number, monthIndex0: number): number {
  return new Date(year, monthIndex0 + 1, 0).getDate();
}

function monthName(year: number, monthIndex0: number): string {
  return new Date(year, monthIndex0, 1).toLocaleDateString("en", {
    month: "long",
  });
}

function dailyTotalsByDate(entries: Entry[]): Map<string, number> {
  const byDate = new Map<string, number>();

  entries.forEach((entry) => {
    byDate.set(
      entry.date,
      (byDate.get(entry.date) || 0) + entry.emission
    );
  });

  return byDate;
}

/*
 * Every calendar month strictly before the current month, from the
 * earliest logged entry onward. These are the only months eligible
 * for a "completed" Monthly Guardian badge.
 */
function getCompletedMonths(
  entries: Entry[],
  now: Date
): { year: number; monthIndex0: number }[] {
  if (entries.length === 0) return [];

  const earliest = entries
    .map((entry) => entry.date)
    .sort()[0];

  const earliestDate = new Date(`${earliest}T00:00:00`);

  const months: { year: number; monthIndex0: number }[] = [];

  const cursor = new Date(
    earliestDate.getFullYear(),
    earliestDate.getMonth(),
    1
  );

  const currentMonthStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    1
  );

  while (cursor < currentMonthStart) {
    months.push({
      year: cursor.getFullYear(),
      monthIndex0: cursor.getMonth(),
    });

    cursor.setMonth(cursor.getMonth() + 1);
  }

  return months;
}

function isMonthCompliant(
  byDate: Map<string, number>,
  year: number,
  monthIndex0: number,
  dailyAverage: number
): boolean {
  const total = daysInMonth(year, monthIndex0);

  for (let day = 1; day <= total; day++) {
    const key = `${year}-${String(monthIndex0 + 1).padStart(
      2,
      "0"
    )}-${String(day).padStart(2, "0")}`;

    const dayTotal = byDate.get(key) || 0;

    if (dayTotal >= dailyAverage) {
      return false;
    }
  }

  return true;
}

export type BadgeCheckResult = {
  newlyUnlocked: UnlockedBadgeInfo[];
  updatedEarned: EarnedBadges;
};

/*
 * Given the CURRENT entries + streak (already computed elsewhere),
 * determine which badges are newly earned. Never removes a badge
 * already present in `earned` — earned badges are permanent.
 */
export function checkBadges(
  entries: Entry[],
  streak: StreakState,
  dailyAverage: number,
  earned: EarnedBadges,
  now: Date = new Date()
): BadgeCheckResult {
  const nextEarned: EarnedBadges = { ...earned };
  const newlyUnlocked: UnlockedBadgeInfo[] = [];
  const nowIso = now.toISOString();

  function award(def: {
    id: string;
    emoji: string;
    name: string;
    description: string;
    image: string;
  }) {
    if (nextEarned[def.id]) return;

    nextEarned[def.id] = nowIso;

    newlyUnlocked.push({ ...def, earnedAt: nowIso });
  }

  if (entries.length >= 1) {
    award(FIRST_STEP);
  }

  for (const badge of STREAK_BADGES) {
    if (streak.current >= (badge.streakTarget || Infinity)) {
      award(badge);
    }
  }

  if (dailyAverage > 0 && entries.length > 0) {
    const byDate = dailyTotalsByDate(entries);

    for (const { year, monthIndex0 } of getCompletedMonths(
      entries,
      now
    )) {
      const id = `monthly_guardian_${monthKey(
        year,
        monthIndex0
      )}`;

      if (nextEarned[id]) continue;

      if (
        isMonthCompliant(
          byDate,
          year,
          monthIndex0,
          dailyAverage
        )
      ) {
        const name = monthName(year, monthIndex0);

        award({
          id,
          emoji: "🛡️",
          name: `${name} Guardian`,
          description: `Maintained your carbon budget throughout ${name} ${year}`,
          image: MONTHLY_GUARDIAN_IMAGE,
        });
      }
    }
  }

  return { newlyUnlocked, updatedEarned: nextEarned };
}

/*
 * Full status list for the 6 core badges (earned/locked + progress),
 * for the Achievements panel.
 */
export function getBadgeStatuses(
  streak: StreakState,
  earned: EarnedBadges
): BadgeStatus[] {
  const list: BadgeStatus[] = [];

  list.push({
    ...FIRST_STEP,
    earned: !!earned[FIRST_STEP.id],
    earnedAt: earned[FIRST_STEP.id],
  });

  for (const badge of STREAK_BADGES) {
    const target = badge.streakTarget || 0;

    list.push({
      id: badge.id,
      emoji: badge.emoji,
      name: badge.name,
      description: badge.description,
      image: badge.image,
      earned: !!earned[badge.id],
      earnedAt: earned[badge.id],
      progress: earned[badge.id]
        ? undefined
        : { current: Math.min(streak.current, target), target },
    });
  }

  return list;
}

/* Earned Monthly Guardian badges, most recent first. */
export function getEarnedMonthlyStatuses(
  earned: EarnedBadges
): BadgeStatus[] {
  return Object.keys(earned)
    .filter((id) => id.startsWith("monthly_guardian_"))
    .sort()
    .reverse()
    .map((id) => {
      const key = id.replace("monthly_guardian_", "");
      const [yearStr, monthStr] = key.split("-");
      const name = monthName(Number(yearStr), Number(monthStr) - 1);

      return {
        id,
        emoji: "🛡️",
        name: `${name} Guardian`,
        description: `Maintained your carbon budget throughout ${name} ${yearStr}`,
        image: MONTHLY_GUARDIAN_IMAGE,
        earned: true,
        earnedAt: earned[id],
      };
    });
}

/* In-progress compliance for the current (not-yet-completed) month. */
export function getCurrentMonthProgress(
  entries: Entry[],
  dailyAverage: number,
  now: Date = new Date()
): { label: string; compliantDays: number; daysSoFar: number; totalDays: number } | null {
  if (dailyAverage <= 0) return null;

  const year = now.getFullYear();
  const monthIndex0 = now.getMonth();
  const dayOfMonth = now.getDate();
  const byDate = dailyTotalsByDate(entries);

  let compliantDays = 0;

  for (let day = 1; day <= dayOfMonth; day++) {
    const key = `${year}-${String(monthIndex0 + 1).padStart(
      2,
      "0"
    )}-${String(day).padStart(2, "0")}`;

    if ((byDate.get(key) || 0) < dailyAverage) {
      compliantDays++;
    }
  }

  return {
    label: `${monthName(year, monthIndex0)} Guardian`,
    compliantDays,
    daysSoFar: dayOfMonth,
    totalDays: daysInMonth(year, monthIndex0),
  };
}
