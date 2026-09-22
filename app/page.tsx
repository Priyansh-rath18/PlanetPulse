"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  Car,
  ChevronDown,
  CircleAlert,
  Cloud,
  Filter,
  Gauge,
  Leaf,
  Plane,
  Plus,
  RefreshCw,
  Save,
  Sparkles,
  Utensils,
  BusFront,
  Zap,
  X,
  Bike,
  Truck,
} from "lucide-react";

type ActivityType =
  | "car"
  | "bus"
  | "flight"
  | "electricity"
  | "veg"
  | "nonveg"
  | "bike"
  | "auto"
  | "truck";

type Entry = {
  id: string;
  type: ActivityType;
  quantity: number;
  date: string;
  emission: number;
};

type Factor = {
  label: string;
  unit: string;
  factor: number;
};

const FACTORS: Record<ActivityType, Factor> = {
  car: {
    label: "Car travel",
    unit: "km",
    factor: 0.2,
  },
  bus: {
    label: "Bus travel",
    unit: "km",
    factor: 0.08,
  },
  flight: {
    label: "Flight",
    unit: "km",
    factor: 0.25,
  },
  electricity: {
    label: "Electricity",
    unit: "kWh",
    factor: 0.8,
  },
  veg: {
    label: "Veg meal",
    unit: "meal",
    factor: 0.5,
  },
  nonveg: {
    label: "Non-veg meal",
    unit: "meal",
    factor: 2.0,
  },
  bike: {
    label: "Motorcycle / Bike",
    unit: "km",
    factor: 0.16,
  },
  auto: {
    label: "Auto Rickshaw",
    unit: "km",
    factor: 0.35,
  },
  truck: {
    label: "Truck",
    unit: "tonne-km",
    factor: 0.05,
  },
};

const ICONS: Record<ActivityType, typeof Car> = {
  car: Car,
  bus: BusFront,
  flight: Plane,
  electricity: Zap,
  veg: Utensils,
  nonveg: Utensils,
  bike: Bike,
  auto: Car,
  truck: Truck,
};

const TRANSPORT_TYPES: ActivityType[] = [
  "car",
  "bus",
  "flight",
  "bike",
  "auto",
  "truck",
];

const FOOD_TYPES: ActivityType[] = [
  "veg",
  "nonveg",
];

const today = new Date();

function dateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function mondayOfWeek(date: Date): Date {
  const copy = new Date(date);
  const day = copy.getDay();

  const diff = day === 0 ? -6 : 1 - day;

  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);

  return copy;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}

function formatShortDate(date: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
  }).format(date);
}

export default function Home() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [target, setTarget] = useState<number>(50);

  const [modal, setModal] = useState<boolean>(false);

  const [type, setType] =
    useState<ActivityType>("car");

  const [quantity, setQuantity] =
    useState<string>("");

  const [entryDate, setEntryDate] =
    useState<string>(dateKey(today));

  const [filterType, setFilterType] =
    useState<"all" | ActivityType>("all");

  const [fromDate, setFromDate] =
    useState<string>("");

  const [toDate, setToDate] =
    useState<string>("");

  const [notice, setNotice] =
    useState<string>("");

  const [globalPulse, setGlobalPulse] =
    useState<number | null>(null);

  const [globalRate, setGlobalRate] =
    useState<number | null>(null);

  const [globalUpdatedAt, setGlobalUpdatedAt] =
    useState<string | null>(null);

  const [globalSource, setGlobalSource] =
    useState<string>("Climate TRACE");

  const [globalLoading, setGlobalLoading] =
    useState<boolean>(true);

  /*
   * LOAD SAVED DATA
   */

  useEffect(() => {
    try {
      const savedEntries = JSON.parse(
        localStorage.getItem("carbon_entries") || "[]"
      );

      const savedTarget = Number(
        localStorage.getItem("carbon_target") || "50"
      );

      if (Array.isArray(savedEntries)) {
        setEntries(savedEntries);
      }

      setTarget(
        Number.isFinite(savedTarget) && savedTarget > 0
          ? savedTarget
          : 50
      );
    } catch {
      setEntries([]);
      setTarget(50);
    }
  }, []);

  /*
   * SAVE ENTRIES
   */

  useEffect(() => {
    localStorage.setItem(
      "carbon_entries",
      JSON.stringify(entries)
    );
  }, [entries]);

  /*
   * SAVE TARGET
   */

  useEffect(() => {
    localStorage.setItem(
      "carbon_target",
      String(target)
    );
  }, [target]);

  /*
   * GLOBAL CARBON API
   */

  useEffect(() => {
    let cancelled = false;

    async function loadGlobalEmissions() {
      try {
        setGlobalLoading(true);

        const response = await fetch(
          "/api/global-emissions",
          {
            cache: "no-store",
          }
        );

        if (!response.ok) {
          throw new Error(
            `API returned ${response.status}`
          );
        }

        const data: {
          currentTonnes?: number;
          tonnesPerSecond?: number;
          dataAsOf?: string;
          source?: string;
        } = await response.json();

        if (cancelled) return;

        const current = Number(
          data.currentTonnes
        );

        const rate = Number(
          data.tonnesPerSecond
        );

        if (Number.isFinite(current)) {
          setGlobalPulse(current);
        }

        if (Number.isFinite(rate)) {
          setGlobalRate(rate);
        }

        setGlobalUpdatedAt(
          data.dataAsOf || null
        );

        setGlobalSource(
          data.source || "Climate TRACE"
        );
      } catch (error) {
        console.error(
          "Global emissions API error:",
          error
        );
      } finally {
        if (!cancelled) {
          setGlobalLoading(false);
        }
      }
    }

    loadGlobalEmissions();

    return () => {
      cancelled = true;
    };
  }, []);

  /*
   * CONTINUOUS GLOBAL PULSE
   */

  useEffect(() => {
    if (
      globalPulse === null ||
      globalRate === null
    ) {
      return;
    }

    const timer = window.setInterval(() => {
      setGlobalPulse((current) => {
        if (current === null) {
          return current;
        }

        return current + globalRate;
      });
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [globalRate]);

  /*
   * WEEK
   */

  const weekStart = useMemo(
    () => mondayOfWeek(today),
    []
  );

  const weekStartKey =
    dateKey(weekStart);

  const weekEnd = useMemo(() => {
    const end = new Date(weekStart);

    end.setDate(end.getDate() + 6);

    return end;
  }, [weekStart]);

  const weekEndKey =
    dateKey(weekEnd);

  /*
   * WEEKLY DATA
   */

  const weeklyEntries = useMemo(
    () =>
      entries.filter(
        (entry) =>
          entry.date >= weekStartKey &&
          entry.date <= weekEndKey
      ),
    [
      entries,
      weekStartKey,
      weekEndKey,
    ]
  );

  const weeklyTotal = useMemo(
    () =>
      weeklyEntries.reduce(
        (total, entry) =>
          total + entry.emission,
        0
      ),
    [weeklyEntries]
  );

  const todayTotal = useMemo(
    () => {
      const todayKey = dateKey(today);

      return entries
        .filter(
          (entry) =>
            entry.date === todayKey
        )
        .reduce(
          (total, entry) =>
            total + entry.emission,
          0
        );
    },
    [entries]
  );

  const progress =
    target > 0
      ? Math.min(
          (weeklyTotal / target) * 100,
          100
        )
      : 0;

  const exceeded =
    weeklyTotal > target;

  /*
   * CATEGORY BREAKDOWN
   */

  const categories = useMemo(() => {
    const map: Record<
      "Transport" | "Food" | "Energy",
      number
    > = {
      Transport: 0,
      Food: 0,
      Energy: 0,
    };

    weeklyEntries.forEach((entry) => {
      let category:
        | "Transport"
        | "Food"
        | "Energy";

      if (
        TRANSPORT_TYPES.includes(
          entry.type
        )
      ) {
        category = "Transport";
      } else if (
        FOOD_TYPES.includes(
          entry.type
        )
      ) {
        category = "Food";
      } else {
        category = "Energy";
      }

      map[category] += entry.emission;
    });

    return (
      Object.entries(map)
        .filter(
          ([, value]) => value > 0
        )
        .sort(
          (a, b) => b[1] - a[1]
        )
    );
  }, [weeklyEntries]);

  const maxCategory =
    Math.max(
      ...categories.map(
        ([, value]) => value
      ),
      1
    );

  /*
   * HISTORY FILTER
   */

  const filteredEntries = useMemo(
    () =>
      entries
        .filter(
          (entry) =>
            filterType === "all" ||
            entry.type === filterType
        )
        .filter(
          (entry) =>
            !fromDate ||
            entry.date >= fromDate
        )
        .filter(
          (entry) =>
            !toDate ||
            entry.date <= toDate
        )
        .sort(
          (a, b) =>
            b.date.localeCompare(
              a.date
            )
        ),
    [
      entries,
      filterType,
      fromDate,
      toDate,
    ]
  );

  /*
   * DAILY WEEK DATA
   */

  const weekDays = useMemo(
    () =>
      Array.from(
        { length: 7 },
        (_, index) => {
          const date =
            new Date(weekStart);

          date.setDate(
            date.getDate() +
              index
          );

          const key =
            dateKey(date);

          const value =
            weeklyEntries
              .filter(
                (entry) =>
                  entry.date === key
              )
              .reduce(
                (total, entry) =>
                  total +
                  entry.emission,
                0
              );

          return {
            key,
            label:
              new Intl.DateTimeFormat(
                "en",
                {
                  weekday:
                    "short",
                }
              ).format(date),
            value,
          };
        }
      ),
    [weekStart, weeklyEntries]
  );

  const maxDay = Math.max(
    ...weekDays.map(
      (day) => day.value
    ),
    1
  );

  /*
   * ADD ACTIVITY
   */

  function addActivity() {
    const q = Number(quantity);

    if (
      !Number.isFinite(q) ||
      q <= 0
    ) {
      setNotice(
        "Enter a quantity greater than 0."
      );
      return;
    }

    if (!entryDate) {
      setNotice(
        "Please select a date."
      );
      return;
    }

    if (
      TRANSPORT_TYPES.includes(
        type
      ) &&
      q > 10000
    ) {
      setNotice(
        "This distance looks unusually high. Please check the value before saving."
      );
      return;
    }

    if (
      type === "electricity" &&
      q > 100000
    ) {
      setNotice(
        "This electricity value looks unusually high. Please check the value before saving."
      );
      return;
    }

    if (
      FOOD_TYPES.includes(type) &&
      q > 1000
    ) {
      setNotice(
        "That meal count looks unusually high. Please check the value before saving."
      );
      return;
    }

    const emission =
      q * FACTORS[type].factor;

    const entry: Entry = {
      id: crypto.randomUUID(),
      type,
      quantity: q,
      date: entryDate,
      emission,
    };

    setEntries((previous) => [
      ...previous,
      entry,
    ]);

    setQuantity("");
    setNotice("");
    setModal(false);
  }

  /*
   * REMOVE
   */

  function removeEntry(id: string) {
    setEntries((previous) =>
      previous.filter(
        (entry) =>
          entry.id !== id
      )
    );
  }

  /*
   * FILTER RESET
   */

  function clearFilters() {
    setFilterType("all");
    setFromDate("");
    setToDate("");
  }

  /*
   * TARGET CHANGE
   */

  function handleTargetChange(
    value: string
  ) {
    const number = Number(value);

    if (
      !Number.isFinite(number) ||
      number <= 0
    ) {
      setTarget(1);
      return;
    }

    setTarget(number);
  }

  /*
   * RENDER
   */

  return (
    <main>
      <div className="ambient ambientOne" />

      <div className="ambient ambientTwo" />

      {/* NAV */}

      <nav className="nav">
        <div className="brand">
          <div className="brandMark">
            <Leaf size={19} />
          </div>

          <div>
            <strong>
              Carbon
              <span>Pulse</span>
            </strong>

            <small>
              PERSONAL CLIMATE
              DASHBOARD
            </small>
          </div>
        </div>

        <button
          className="primaryBtn"
          onClick={() =>
            setModal(true)
          }
        >
          <Plus size={18} />
          Log activity
        </button>
      </nav>

      {/* HERO */}

      <section className="hero">
        <div>
          <div className="eyebrow">
            <span className="liveDot" />
            LIVE ESTIMATE •{" "}
            {new Intl.DateTimeFormat(
              "en",
              {
                month: "short",
                day: "numeric",
                year: "numeric",
              }
            ).format(today)}
          </div>

          <h1>
            See your impact.
            <br />
            <span>
              Change your trajectory.
            </span>
          </h1>

          <p>
            Turn everyday choices
            into a clear carbon
            footprint — without guilt,
            guesswork, or complicated
            accounting.
          </p>
        </div>

        <div className="heroGlobe">
          <div className="globeRing ring1" />
          <div className="globeRing ring2" />

          <div className="globeCore">
            <Cloud size={40} />
          </div>

          <div className="orbitDot dotA" />
          <div className="orbitDot dotB" />
          <div className="orbitDot dotC" />
        </div>
      </section>

      {/* GLOBAL PULSE */}

      <section className="globalPulse">
        <div className="pulseIcon">
          <Cloud size={22} />
        </div>

        <div className="pulseCopy">
          <span>
            GLOBAL CARBON PULSE
          </span>

          <strong>
            {globalLoading ||
            globalPulse === null
              ? "Loading…"
              : `${globalPulse.toLocaleString(
                  "en-IN",
                  {
                    maximumFractionDigits: 0,
                  }
                )} tonnes`}
          </strong>

          <small>
            2026 global GHG
            estimate · Climate TRACE
            data through June 2026 ·
            continuously extrapolated
            between data updates
          </small>

          {globalUpdatedAt && (
            <small>
              Latest data:{" "}
              {new Intl.DateTimeFormat(
                "en-IN",
                {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                }
              ).format(
                new Date(
                  `${globalUpdatedAt}T12:00:00`
                )
              )}{" "}
              · {globalSource}
            </small>
          )}
        </div>

        <div className="pulseRate">
          <ArrowUpRight size={16} />
          ~
          {globalRate === null
            ? "—"
            : globalRate.toFixed(0)}{" "}
          tonnes/sec
        </div>
      </section>

      {/* STATS */}

      <section className="statsGrid">
        <div className="statCard mainStat">
          <div className="statTop">
            <span>THIS WEEK</span>
            <Gauge size={18} />
          </div>

          <div className="bigNumber">
            {weeklyTotal.toFixed(1)}{" "}
            <small>kg CO₂</small>
          </div>

          <div className="miniTrend">
            <ArrowDownRight size={15} />
            Personal activity
            footprint
          </div>
        </div>

        <div className="statCard">
          <div className="statTop">
            <span>WEEKLY TARGET</span>
            <Leaf size={18} />
          </div>

          <div className="bigNumber">
            {target.toFixed(1)}{" "}
            <small>kg</small>
          </div>

          <label className="targetEdit">
            Set target

            <input
              type="number"
              min="1"
              step="0.1"
              value={target}
              onChange={(event) =>
                handleTargetChange(
                  event.target.value
                )
              }
            />
          </label>
        </div>

        <div className="statCard">
          <div className="statTop">
            <span>TODAY</span>
            <CalendarDays size={18} />
          </div>

          <div className="bigNumber">
            {todayTotal.toFixed(1)}{" "}
            <small>kg</small>
          </div>

          <div className="miniTrend">
            Your activity today
          </div>
        </div>
      </section>

      {/* DASHBOARD */}

      <section className="dashboardGrid">
        {/* TARGET */}

        <div className="panel targetPanel">
          <div className="panelHeader">
            <div>
              <span className="sectionLabel">
                WEEKLY TARGET
              </span>

              <h2>
                {formatShortDate(
                  weekStart
                )}{" "}
                —{" "}
                {formatShortDate(
                  weekEnd
                )}
              </h2>
            </div>

            <span
              className={
                exceeded
                  ? "status danger"
                  : "status"
              }
            >
              {exceeded
                ? "Target exceeded"
                : `${Math.max(
                    target -
                      weeklyTotal,
                    0
                  ).toFixed(
                    1
                  )} kg remaining`}
            </span>
          </div>

          <div className="progressTrack">
            <div
              className={
                exceeded
                  ? "progressFill dangerFill"
                  : "progressFill"
              }
              style={{
                width: `${progress}%`,
              }}
            />
          </div>

          <div className="progressMeta">
            <strong>
              {weeklyTotal.toFixed(1)}{" "}
              / {target.toFixed(1)} kg
            </strong>

            <span>
              {target > 0
                ? Math.min(
                    (weeklyTotal /
                      target) *
                      100,
                    999
                  ).toFixed(0)
                : "0"}
              %
            </span>
          </div>

          <div
            className={
              exceeded
                ? "nudge nudgeDanger"
                : "nudge"
            }
          >
            {exceeded ? (
              <CircleAlert size={20} />
            ) : (
              <Sparkles size={20} />
            )}

            <div>
              <strong>
                {exceeded
                  ? "Your target has been crossed."
                  : "You're tracking your impact."}
              </strong>

              <p>
                {exceeded
                  ? "Keep logging normally. Use the rest of the week to notice lower-emission choices — no shame, just useful feedback."
                  : "Small, consistent choices make your footprint easier to understand and manage."}
              </p>
            </div>
          </div>
        </div>

        {/* BREAKDOWN */}

        <div className="panel">
          <div className="panelHeader">
            <div>
              <span className="sectionLabel">
                BREAKDOWN
              </span>

              <h2>
                Where it comes from
              </h2>
            </div>

            <Activity size={18} />
          </div>

          <div className="bars">
            {categories.length ===
            0 ? (
              <div className="empty">
                Add activities to see
                your breakdown.
              </div>
            ) : (
              categories.map(
                ([name, value]) => (
                  <div
                    className="barRow"
                    key={name}
                  >
                    <div className="barName">
                      <span>
                        {name}
                      </span>

                      <strong>
                        {value.toFixed(
                          1
                        )}{" "}
                        kg
                      </strong>
                    </div>

                    <div className="barTrack">
                      <div
                        className="barFill"
                        style={{
                          width: `${Math.max(
                            (value /
                              maxCategory) *
                              100,
                            5
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                )
              )
            )}
          </div>
        </div>
      </section>

      {/* WEEK CHART */}

      <section className="panel chartPanel">
        <div className="panelHeader">
          <div>
            <span className="sectionLabel">
              WEEK IN VIEW
            </span>

            <h2>
              Daily footprint
            </h2>
          </div>

          <span className="dateBadge">
            Monday → Sunday
          </span>
        </div>

        <div className="weekChart">
          {weekDays.map((day) => (
            <div
              className="dayCol"
              key={day.key}
            >
              <div className="dayValue">
                {day.value
                  ? day.value.toFixed(1)
                  : "—"}
              </div>

              <div className="chartBarTrack">
                <div
                  className="chartBar"
                  style={{
                    height: `${Math.max(
                      (day.value /
                        maxDay) *
                        100,
                      day.value
                        ? 8
                        : 2
                    )}%`,
                  }}
                />
              </div>

              <span>
                {day.label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* HISTORY */}

      <section className="panel historyPanel">
        <div className="panelHeader historyHeader">
          <div>
            <span className="sectionLabel">
              ACTIVITY LOG
            </span>

            <h2>
              History & filters
            </h2>
          </div>

          <button
            className="secondaryBtn"
            onClick={clearFilters}
          >
            <RefreshCw size={15} />
            Reset filters
          </button>
        </div>

        <div className="filters">
          <div className="selectWrap">
            <Filter size={15} />

            <select
              value={filterType}
              onChange={(event) =>
                setFilterType(
                  event.target
                    .value as
                    | "all"
                    | ActivityType
                )
              }
            >
              <option value="all">
                All activity types
              </option>

              {(
                Object.entries(
                  FACTORS
                ) as [
                  ActivityType,
                  Factor
                ][]
              ).map(
                ([key, factor]) => (
                  <option
                    key={key}
                    value={key}
                  >
                    {factor.label}
                  </option>
                )
              )}
            </select>

            <ChevronDown size={15} />
          </div>

          <input
            type="date"
            value={fromDate}
            onChange={(event) =>
              setFromDate(
                event.target.value
              )
            }
          />

          <span className="to">
            to
          </span>

          <input
            type="date"
            value={toDate}
            onChange={(event) =>
              setToDate(
                event.target.value
              )
            }
          />
        </div>

        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>Activity</th>
                <th>Date</th>
                <th>Quantity</th>
                <th>CO₂</th>
                <th />
              </tr>
            </thead>

            <tbody>
              {filteredEntries.length ===
              0 ? (
                <tr>
                  <td colSpan={5}>
                    <div className="empty tableEmpty">
                      No activities
                      match these
                      filters.
                    </div>
                  </td>
                </tr>
              ) : (
                filteredEntries.map(
                  (entry) => {
                    const Icon =
                      ICONS[
                        entry.type
                      ];

                    return (
                      <tr
                        key={
                          entry.id
                        }
                      >
                        <td>
                          <div className="activityCell">
                            <span className="activityIcon">
                              <Icon
                                size={17}
                              />
                            </span>

                            <strong>
                              {
                                FACTORS[
                                  entry.type
                                ].label
                              }
                            </strong>
                          </div>
                        </td>

                        <td>
                          {formatDate(
                            entry.date
                          )}
                        </td>

                        <td>
                          {entry.quantity.toLocaleString(
                            "en-IN"
                          )}{" "}
                          {
                            FACTORS[
                              entry.type
                            ].unit
                          }
                        </td>

                        <td>
                          <strong>
                            {entry.emission.toFixed(
                              2
                            )}{" "}
                            kg
                          </strong>
                        </td>

                        <td>
                          <button
                            className="deleteBtn"
                            aria-label="Delete activity"
                            onClick={() =>
                              removeEntry(
                                entry.id
                              )
                            }
                          >
                            <X size={15} />
                          </button>
                        </td>
                      </tr>
                    );
                  }
                )
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* FOOTER */}

      <footer>
        <span>
          <Leaf size={15} />
          CarbonPulse
        </span>

        <span>
          Built for Climate Tech ·
          No account required
        </span>
      </footer>

      {/* LOG ACTIVITY MODAL */}

      {modal && (
        <div
          className="modalBackdrop"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setModal(false);
              setNotice("");
            }
          }}
        >
          <div className="modal">
            <div className="modalTop">
              <div>
                <span className="sectionLabel">
                  NEW ENTRY
                </span>

                <h2>
                  Log an activity
                </h2>
              </div>

              <button
                className="iconBtn"
                onClick={() => {
                  setModal(false);
                  setNotice("");
                }}
                aria-label="Close"
              >
                <X />
              </button>
            </div>

            <label>
              Activity type
            </label>

            <div className="typeGrid">
              {(
                Object.keys(
                  FACTORS
                ) as ActivityType[]
              ).map((key) => {
                const Icon =
                  ICONS[key];

                return (
                  <button
                    type="button"
                    key={key}
                    className={
                      type === key
                        ? "typeBtn activeType"
                        : "typeBtn"
                    }
                    onClick={() => {
                      setType(key);
                      setNotice("");
                    }}
                  >
                    <Icon size={18} />

                    <span>
                      {
                        FACTORS[
                          key
                        ].label
                      }
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="inputRow">
              <div>
                <label>
                  Quantity
                </label>

                <input
                  autoFocus
                  type="number"
                  min="0"
                  step="any"
                  placeholder="e.g. 10"
                  value={quantity}
                  onChange={(event) => {
                    setQuantity(
                      event.target.value
                    );
                    setNotice("");
                  }}
                />
              </div>

              <div>
                <label>
                  Unit
                </label>

                <div className="unitBox">
                  {
                    FACTORS[
                      type
                    ].unit
                  }
                </div>
              </div>
            </div>

            <label>
              Date
            </label>

            <input
              type="date"
              value={entryDate}
              onChange={(event) => {
                setEntryDate(
                  event.target.value
                );
                setNotice("");
              }}
            />

            <div className="calcPreview">
              <span>
                Estimated footprint
              </span>

              <strong>
                {quantity &&
                Number(quantity) > 0
                  ? (
                      Number(
                        quantity
                      ) *
                      FACTORS[
                        type
                      ].factor
                    ).toFixed(2)
                  : "0.00"}{" "}
                kg CO₂
              </strong>

              <small>
                {
                  FACTORS[
                    type
                  ].factor
                }{" "}
                kg CO₂ /{" "}
                {
                  FACTORS[
                    type
                  ].unit
                }
              </small>
            </div>

            {notice && (
              <div className="modalNotice">
                <CircleAlert size={16} />
                {notice}
              </div>
            )}

            <button
              type="button"
              className="primaryBtn wide"
              onClick={
                addActivity
              }
            >
              <Save size={17} />
              Save activity
            </button>
          </div>
        </div>
      )}
    </main>
  );
}