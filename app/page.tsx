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
  Droplets,
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
} from "lucide-react";

type ActivityType = "car" | "bus" | "flight" | "electricity" | "veg" | "nonveg";

type Entry = {
  id: string;
  type: ActivityType;
  quantity: number;
  date: string;
  emission: number;
};

const FACTORS: Record<ActivityType, { label: string; unit: string; factor: number }> = {
  car: { label: "Car travel", unit: "km", factor: 0.20 },
  bus: { label: "Bus travel", unit: "km", factor: 0.08 },
  flight: { label: "Flight", unit: "km", factor: 0.25 },
  electricity: { label: "Electricity", unit: "kWh", factor: 0.80 },
  veg: { label: "Veg meal", unit: "meal", factor: 0.50 },
  nonveg: { label: "Non-veg meal", unit: "meal", factor: 2.00 },
};

const ICONS: Record<ActivityType, React.ComponentType<{ size?: number; strokeWidth?: number }>> = {
  car: Car,
  bus: BusFront,
  flight: Plane,
  electricity: Zap,
  veg: Utensils,
  nonveg: Utensils,
};

const today = new Date();

function dateKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function mondayOfWeek(d: Date) {
  const copy = new Date(d);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function formatDate(s: string) {
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${s}T12:00:00`));
}

function formatShortDate(d: Date) {
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short" }).format(d);
}

export default function Home() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [target, setTarget] = useState(50);
  const [modal, setModal] = useState(false);
  const [type, setType] = useState<ActivityType>("car");
  const [quantity, setQuantity] = useState("");
  const [entryDate, setEntryDate] = useState(dateKey(today));
  const [filterType, setFilterType] = useState<"all" | ActivityType>("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [notice, setNotice] = useState("");
  const [globalPulse, setGlobalPulse] = useState<number | null>(null);
  const [globalRate, setGlobalRate] = useState<number | null>(null);
  const [globalUpdatedAt, setGlobalUpdatedAt] = useState<string | null>(null);
  const [globalSource, setGlobalSource] = useState<string>("Climate TRACE");
  const [globalLoading, setGlobalLoading] = useState(true);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("carbon_entries") || "[]");
      const savedTarget = Number(localStorage.getItem("carbon_target") || "50");
      setEntries(Array.isArray(saved) ? saved : []);
      setTarget(savedTarget > 0 ? savedTarget : 50);
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem("carbon_entries", JSON.stringify(entries));
  }, [entries]);

  useEffect(() => {
    localStorage.setItem("carbon_target", String(target));
  }, [target]);

  useEffect(() => {
    let cancelled = false;

    async function loadGlobalEmissions() {
      try {
        const response = await fetch("/api/global-emissions", { cache: "no-store" });
        if (!response.ok) throw new Error(`Global emissions API returned ${response.status}`);
        const data = await response.json();
        if (cancelled) return;
        setGlobalPulse(Number(data.currentTonnes));
        setGlobalRate(Number(data.tonnesPerSecond));
        setGlobalUpdatedAt(data.dataAsOf || null);
        setGlobalSource(data.source || "Climate TRACE");
      } catch (error) {
        console.error("Global emissions API error:", error);
      } finally {
        if (!cancelled) setGlobalLoading(false);
      }
    }

    loadGlobalEmissions();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (globalPulse === null || globalRate === null) return;
    const timer = setInterval(() => {
      setGlobalPulse((value) => (value === null ? value : value + globalRate));
    }, 1000);
    return () => clearInterval(timer);
  }, [globalPulse !== null, globalRate]);

  const weekStart = mondayOfWeek(today);
  const weekStartKey = dateKey(weekStart);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const weekEndKey = dateKey(weekEnd);

  const weeklyEntries = entries.filter((e) => e.date >= weekStartKey && e.date <= weekEndKey);
  const weeklyTotal = weeklyEntries.reduce((a, e) => a + e.emission, 0);
  const todayTotal = entries.filter((e) => e.date === dateKey(today)).reduce((a, e) => a + e.emission, 0);
  const progress = Math.min((weeklyTotal / target) * 100, 100);
  const exceeded = weeklyTotal > target;

  const categories = useMemo(() => {
    const map: Record<string, number> = {};
    weeklyEntries.forEach((e) => {
      const group = ["car", "bus", "flight"].includes(e.type) ? "Transport" :
        ["veg", "nonveg"].includes(e.type) ? "Food" : "Energy";
      map[group] = (map[group] || 0) + e.emission;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [weeklyEntries]);

  const filteredEntries = entries
    .filter((e) => filterType === "all" || e.type === filterType)
    .filter((e) => !fromDate || e.date >= fromDate)
    .filter((e) => !toDate || e.date <= toDate)
    .sort((a, b) => b.date.localeCompare(a.date));

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    const key = dateKey(d);
    return {
      key,
      label: new Intl.DateTimeFormat("en", { weekday: "short" }).format(d),
      value: weeklyEntries.filter((e) => e.date === key).reduce((a, e) => a + e.emission, 0),
    };
  });
  const maxDay = Math.max(...weekDays.map((d) => d.value), 1);

  function addActivity() {
    const q = Number(quantity);
    if (!q || q <= 0) {
      setNotice("Enter a quantity greater than 0.");
      return;
    }
    if ((type === "car" || type === "bus" || type === "flight") && q > 10000) {
      setNotice("This distance looks unusually high. Please check the value before saving.");
      return;
    }
    if (type === "electricity" && q > 100000) {
      setNotice("This electricity value looks unusually high. Please check the value before saving.");
      return;
    }
    const emission = q * FACTORS[type].factor;
    const entry: Entry = {
      id: crypto.randomUUID(),
      type,
      quantity: q,
      date: entryDate,
      emission,
    };
    setEntries((prev) => [...prev, entry]);
    setQuantity("");
    setNotice("");
    setModal(false);
  }

  function removeEntry(id: string) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  function clearFilters() {
    setFilterType("all");
    setFromDate("");
    setToDate("");
  }

  return (
    <main>
      <div className="ambient ambientOne" />
      <div className="ambient ambientTwo" />

      <nav className="nav">
        <div className="brand">
          <div className="brandMark"><Leaf size={19} /></div>
          <div>
            <strong>Carbon<span>Pulse</span></strong>
            <small>PERSONAL CLIMATE DASHBOARD</small>
          </div>
        </div>
        <button className="primaryBtn" onClick={() => setModal(true)}><Plus size={18} /> Log activity</button>
      </nav>

      <section className="hero">
        <div>
          <div className="eyebrow"><span className="liveDot" /> LIVE ESTIMATE • {new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(today)}</div>
          <h1>See your impact.<br /><span>Change your trajectory.</span></h1>
          <p>Turn everyday choices into a clear carbon footprint — without guilt, guesswork, or complicated accounting.</p>
        </div>
        <div className="heroGlobe">
          <div className="globeRing ring1" />
          <div className="globeRing ring2" />
          <div className="globeCore"><Cloud size={40} /></div>
          <div className="orbitDot dotA" /><div className="orbitDot dotB" /><div className="orbitDot dotC" />
        </div>
      </section>

      <section className="globalPulse">
        <div className="pulseIcon"><Cloud size={22} /></div>
        <div className="pulseCopy">
          <span>GLOBAL CARBON PULSE</span>
          <strong>{globalLoading || globalPulse === null ? "Loading…" : `${globalPulse.toLocaleString("en-IN", { maximumFractionDigits: 0 })} tonnes`}</strong>
          <small>2026 global GHG estimate · Climate TRACE data through June 2026 · continuously extrapolated between data updates</small>
          {globalUpdatedAt && <small>Latest data: {new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${globalUpdatedAt}T12:00:00`))} · {globalSource}</small>}
        </div>
        <div className="pulseRate"><ArrowUpRight size={16} /> ~{globalRate === null ? "—" : globalRate.toFixed(0)} tonnes/sec</div>
      </section>

      <section className="statsGrid">
        <div className="statCard mainStat">
          <div className="statTop"><span>THIS WEEK</span><Gauge size={18} /></div>
          <div className="bigNumber">{weeklyTotal.toFixed(1)} <small>kg CO₂</small></div>
          <div className="miniTrend"><ArrowDownRight size={15} /> Personal activity footprint</div>
        </div>
        <div className="statCard">
          <div className="statTop"><span>WEEKLY TARGET</span><Leaf size={18} /></div>
          <div className="bigNumber">{target.toFixed(0)} <small>kg</small></div>
          <label className="targetEdit">Set target <input type="number" min="1" value={target} onChange={(e) => setTarget(Number(e.target.value) || 1)} /></label>
        </div>
        <div className="statCard">
          <div className="statTop"><span>TODAY</span><CalendarDays size={18} /></div>
          <div className="bigNumber">{todayTotal.toFixed(1)} <small>kg</small></div>
          <div className="miniTrend">Your activity today</div>
        </div>
      </section>

      <section className="dashboardGrid">
        <div className="panel targetPanel">
          <div className="panelHeader">
            <div><span className="sectionLabel">WEEKLY TARGET</span><h2>{formatShortDate(weekStart)} — {formatShortDate(weekEnd)}</h2></div>
            <span className={exceeded ? "status danger" : "status"}>{exceeded ? "Target exceeded" : `${Math.max(target - weeklyTotal, 0).toFixed(1)} kg remaining`}</span>
          </div>
          <div className="progressTrack"><div className={exceeded ? "progressFill dangerFill" : "progressFill"} style={{ width: `${progress}%` }} /></div>
          <div className="progressMeta"><strong>{weeklyTotal.toFixed(1)} / {target.toFixed(1)} kg</strong><span>{Math.min((weeklyTotal / target) * 100, 999).toFixed(0)}%</span></div>
          <div className={exceeded ? "nudge nudgeDanger" : "nudge"}>
            {exceeded ? <CircleAlert size={20} /> : <Sparkles size={20} />}
            <div>
              <strong>{exceeded ? "Your target has been crossed." : "You're tracking your impact."}</strong>
              <p>{exceeded ? "Keep logging normally. Use the rest of the week to notice lower-emission choices — no shame, just useful feedback." : "Small, consistent choices make your footprint easier to understand and manage."}</p>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panelHeader"><div><span className="sectionLabel">BREAKDOWN</span><h2>Where it comes from</h2></div><Activity size={18} /></div>
          <div className="bars">
            {categories.length === 0 ? <div className="empty">Add activities to see your breakdown.</div> :
              categories.map(([name, value]) => (
                <div className="barRow" key={name}>
                  <div className="barName"><span>{name}</span><strong>{value.toFixed(1)} kg</strong></div>
                  <div className="barTrack"><div className="barFill" style={{ width: `${Math.max((value / Math.max(...categories.map(c => c[1]), 1)) * 100, 5)}%` }} /></div>
                </div>
              ))}
          </div>
        </div>
      </section>

      <section className="panel chartPanel">
        <div className="panelHeader">
          <div><span className="sectionLabel">WEEK IN VIEW</span><h2>Daily footprint</h2></div>
          <span className="dateBadge">Monday → Sunday</span>
        </div>
        <div className="weekChart">
          {weekDays.map((d) => (
            <div className="dayCol" key={d.key}>
              <div className="dayValue">{d.value ? `${d.value.toFixed(1)}` : "—"}</div>
              <div className="chartBarTrack"><div className="chartBar" style={{ height: `${Math.max((d.value / maxDay) * 100, d.value ? 8 : 2)}%` }} /></div>
              <span>{d.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="panel historyPanel">
        <div className="panelHeader historyHeader">
          <div><span className="sectionLabel">ACTIVITY LOG</span><h2>History & filters</h2></div>
          <button className="secondaryBtn" onClick={clearFilters}><RefreshCw size={15} /> Reset filters</button>
        </div>
        <div className="filters">
          <div className="selectWrap"><Filter size={15} /><select value={filterType} onChange={(e) => setFilterType(e.target.value as any)}>
            <option value="all">All activity types</option>
            {Object.entries(FACTORS).map(([key, v]) => <option key={key} value={key}>{v.label}</option>)}
          </select><ChevronDown size={15} /></div>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          <span className="to">to</span>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </div>
        <div className="tableWrap">
          <table>
            <thead><tr><th>Activity</th><th>Date</th><th>Quantity</th><th>CO₂</th><th /></tr></thead>
            <tbody>
              {filteredEntries.length === 0 ? <tr><td colSpan={5}><div className="empty tableEmpty">No activities match these filters.</div></td></tr> :
                filteredEntries.map((e) => {
                  const Icon = ICONS[e.type];
                  return <tr key={e.id}>
                    <td><div className="activityCell"><span className="activityIcon"><Icon size={17} /></span><strong>{FACTORS[e.type].label}</strong></div></td>
                    <td>{formatDate(e.date)}</td>
                    <td>{e.quantity.toLocaleString("en-IN")} {FACTORS[e.type].unit}</td>
                    <td><strong>{e.emission.toFixed(2)} kg</strong></td>
                    <td><button className="deleteBtn" aria-label="Delete" onClick={() => removeEntry(e.id)}><X size={15} /></button></td>
                  </tr>;
                })}
            </tbody>
          </table>
        </div>
      </section>

      <footer>
        <span><Leaf size={15} /> CarbonPulse</span>
        <span>Built for Climate Tech · No account required</span>
      </footer>

      {modal && <div className="modalBackdrop" onMouseDown={(e) => e.target === e.currentTarget && setModal(false)}>
        <div className="modal">
          <div className="modalTop"><div><span className="sectionLabel">NEW ENTRY</span><h2>Log an activity</h2></div><button className="iconBtn" onClick={() => setModal(false)}><X /></button></div>
          <label>Activity type</label>
          <div className="typeGrid">
            {(Object.keys(FACTORS) as ActivityType[]).map((k) => {
              const Icon = ICONS[k];
              return <button key={k} className={type === k ? "typeBtn activeType" : "typeBtn"} onClick={() => setType(k)}><Icon size={18} /><span>{FACTORS[k].label}</span></button>;
            })}
          </div>
          <div className="inputRow">
            <div><label>Quantity</label><input autoFocus type="number" min="0" step="any" placeholder="e.g. 10" value={quantity} onChange={(e) => setQuantity(e.target.value)} /></div>
            <div><label>Unit</label><div className="unitBox">{FACTORS[type].unit}</div></div>
          </div>
          <label>Date</label>
          <input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} />
          <div className="calcPreview"><span>Estimated footprint</span><strong>{quantity && Number(quantity) > 0 ? (Number(quantity) * FACTORS[type].factor).toFixed(2) : "0.00"} kg CO₂</strong><small>{FACTORS[type].factor.toFixed(2)} kg CO₂ / {FACTORS[type].unit}</small></div>
          {notice && <div className="modalNotice"><CircleAlert size={16} /> {notice}</div>}
          <button className="primaryBtn wide" onClick={addActivity}><Save size={17} /> Save activity</button>
        </div>
      </div>}
    </main>
  );
}