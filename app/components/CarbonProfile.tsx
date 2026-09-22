"use client";

import { useMemo, useState } from "react";
import {
  Bike,
  BusFront,
  Car,
  Truck,
  X,
  Save,
  Zap,
  Plus,
  Users,
  Target,
  CalendarDays,
  Info,
} from "lucide-react";

type VehicleKind =
  | "car"
  | "bus"
  | "bike"
  | "auto"
  | "truck";

type TransportPeriod =
  | "typical_week"
  | "last_7_days"
  | "last_30_days";

type ElectricityPeriod =
  | "last_bill"
  | "three_bill_average"
  | "estimated_monthly";

type Vehicle = {
  id: string;
  kind: VehicleKind;
  trips: number;
  distance: number;
  payload?: number;
};

type Profile = {
  vehicles: Vehicle[];

  transportPeriod: TransportPeriod;
  transportStartDate: string;
  transportEndDate: string;

  electricityPeriod: ElectricityPeriod;
  monthlyKwh: number;
  electricityStartDate: string;
  electricityEndDate: string;

  householdSize: number;
  country: "India";

  reduction: number;

  /*
   * NEW:
   * How much of the historical travel pattern
   * is actually expected to continue next week.
   *
   * 100% = same frequency expected
   * 50% = half of the observed frequency
   * etc.
   */
  expectedTravelPercent: number;

  updatedAt: string;
};

type Props = {
  open: boolean;
  onClose: () => void;

  onApply: (
    weeklyBudget: number,
    profile: Profile
  ) => void;
};

/*
 * Hackathon-provided factors:
 *
 * Car  = 0.20 kg/km
 * Bus  = 0.08 kg/km
 *
 * Additional practical transport factors:
 *
 * Bike = 0.16 kg/km
 * Auto = 0.35 kg/km
 *
 * Truck is intentionally kept at 0.05 kg/km
 * as a simplified vehicle-level factor.
 *
 * IMPORTANT:
 * We do NOT multiply truck emissions
 * by payload because that would make the
 * factor inconsistent with kg CO2/km.
 */

const VEHICLES: Record<
  VehicleKind,
  {
    label: string;
    factor: number;
  }
> = {
  car: {
    label: "Car",
    factor: 0.2,
  },

  bus: {
    label: "Bus",
    factor: 0.08,
  },

  bike: {
    label: "Bike",
    factor: 0.16,
  },

  auto: {
    label: "Auto Rickshaw",
    factor: 0.35,
  },

  truck: {
    label: "Truck",
    factor: 0.05,
  },
};

const ICONS = {
  car: Car,
  bus: BusFront,
  bike: Bike,
  auto: Car,
  truck: Truck,
};

function formatDate(date: string) {
  if (!date) return "";

  const parsed = new Date(`${date}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return parsed.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function CarbonProfile({
  open,
  onClose,
  onApply,
}: Props) {
  /*
   * =========================================================
   * TRANSPORT
   * =========================================================
   */

  const [vehicles, setVehicles] = useState<Vehicle[]>([
    {
      id: crypto.randomUUID(),
      kind: "car",
      trips: 5,
      distance: 10,
    },
  ]);

  const [
    transportPeriod,
    setTransportPeriod,
  ] = useState<TransportPeriod>("typical_week");

  const [
    transportStartDate,
    setTransportStartDate,
  ] = useState("");

  const [
    transportEndDate,
    setTransportEndDate,
  ] = useState("");

  /*
   * NEW:
   *
   * This prevents an unusual previous week
   * from automatically becoming the next week's
   * budget.
   *
   * Example:
   *
   * Last week = 50 car trips
   * Expected next week = 20%
   *
   * Baseline contribution becomes:
   *
   * 50 × 20% = 10 equivalent trips
   */

  const [
    expectedTravelPercent,
    setExpectedTravelPercent,
  ] = useState(100);

  /*
   * =========================================================
   * ELECTRICITY
   * =========================================================
   */

  const [
    electricityPeriod,
    setElectricityPeriod,
  ] = useState<ElectricityPeriod>("last_bill");

  const [monthlyKwh, setMonthlyKwh] =
    useState(150);

  const [
    electricityStartDate,
    setElectricityStartDate,
  ] = useState("");

  const [
    electricityEndDate,
    setElectricityEndDate,
  ] = useState("");

  const [householdSize, setHouseholdSize] =
    useState(1);

  /*
   * =========================================================
   * REDUCTION
   * =========================================================
   */

  const [reduction, setReduction] =
    useState(10);

  const [message, setMessage] =
    useState("");

  /*
   * =========================================================
   * TRANSPORT CALCULATION
   * =========================================================
   *
   * First calculate observed emissions.
   *
   * Then convert the selected historical period
   * into a weekly equivalent.
   *
   * Finally apply expectedTravelPercent.
   *
   * This creates:
   *
   * observed baseline
   *       ↓
   * weekly equivalent
   *       ↓
   * expected future usage
   */

  const observedWeeklyTransport =
    useMemo(() => {
      const rawEmission =
        vehicles.reduce(
          (total, vehicle) => {
            const factor =
              VEHICLES[vehicle.kind].factor;

            const trips =
              Math.max(vehicle.trips, 0);

            const distance =
              Math.max(vehicle.distance, 0);

            const emission =
              trips *
              distance *
              factor;

            return total + emission;
          },
          0
        );

      if (
        transportPeriod ===
        "last_30_days"
      ) {
        return (rawEmission / 30) * 7;
      }

      /*
       * Typical week and last 7 days
       * are already weekly values.
       */

      return rawEmission;
    }, [
      vehicles,
      transportPeriod,
    ]);

  /*
   * FUTURE EXPECTED TRANSPORT
   *
   * This is the important fix.
   */

  const weeklyTransport =
    useMemo(() => {
      const multiplier =
        Math.min(
          Math.max(
            expectedTravelPercent,
            0
          ),
          100
        ) / 100;

      return (
        observedWeeklyTransport *
        multiplier
      );
    }, [
      observedWeeklyTransport,
      expectedTravelPercent,
    ]);

  /*
   * =========================================================
   * ELECTRICITY CALCULATION
   * =========================================================
   *
   * Hackathon factor:
   *
   * 0.80 kg CO2 / kWh
   *
   * Monthly household consumption
   * → monthly household emissions
   * → weekly household emissions
   * → personal share
   */

  const weeklyElectricity =
    useMemo(() => {
      const monthlyEmission =
        Math.max(monthlyKwh, 0) * 0.8;

      const weeklyHouseholdEmission =
        monthlyEmission / 4.345;

      return (
        weeklyHouseholdEmission /
        Math.max(
          householdSize,
          1
        )
      );
    }, [
      monthlyKwh,
      householdSize,
    ]);

  /*
   * =========================================================
   * BASELINE
   * =========================================================
   */

  const baseline =
    weeklyTransport +
    weeklyElectricity;

  /*
   * Personal target
   */

  const weeklyBudget =
    baseline *
    (1 -
      Math.min(
        Math.max(
          reduction,
          0
        ),
        80
      ) /
        100);

  /*
   * =========================================================
   * VEHICLE HELPERS
   * =========================================================
   */

  function updateVehicle(
    id: string,
    field: keyof Vehicle,
    value: string
  ) {
    setVehicles((current) =>
      current.map((vehicle) => {
        if (vehicle.id !== id) {
          return vehicle;
        }

        if (field === "kind") {
          return {
            ...vehicle,
            kind: value as VehicleKind,
          };
        }

        return {
          ...vehicle,
          [field]:
            Number(value) || 0,
        };
      })
    );
  }

  function addVehicle() {
    setVehicles((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        kind: "bike",
        trips: 3,
        distance: 5,
      },
    ]);
  }

  function removeVehicle(id: string) {
    setVehicles((current) =>
      current.filter(
        (vehicle) =>
          vehicle.id !== id
      )
    );
  }

  /*
   * =========================================================
   * SAVE PROFILE
   * =========================================================
   */

  function saveProfile() {
    if (
      transportPeriod !==
        "typical_week" &&
      (!transportStartDate ||
        !transportEndDate)
    ) {
      setMessage(
        "Please select the transport period dates."
      );

      return;
    }

    if (
      electricityPeriod !==
        "estimated_monthly" &&
      (!electricityStartDate ||
        !electricityEndDate)
    ) {
      setMessage(
        "Please select the electricity bill period."
      );

      return;
    }

    if (
      monthlyKwh < 0 ||
      householdSize < 1
    ) {
      setMessage(
        "Please enter valid electricity and household values."
      );

      return;
    }

    if (
      expectedTravelPercent < 0 ||
      expectedTravelPercent > 100
    ) {
      setMessage(
        "Expected travel must be between 0% and 100%."
      );

      return;
    }

    const profile: Profile = {
      vehicles,

      transportPeriod,
      transportStartDate,
      transportEndDate,

      electricityPeriod,
      monthlyKwh,
      electricityStartDate,
      electricityEndDate,

      householdSize,

      country: "India",

      reduction,

      expectedTravelPercent,

      updatedAt:
        new Date().toISOString(),
    };

    localStorage.setItem(
      "carbon_profile",
      JSON.stringify(profile)
    );

    onApply(
      Number(
        Math.max(
          weeklyBudget,
          1
        ).toFixed(1)
      ),
      profile
    );

    setMessage("");
  }

  if (!open) {
    return null;
  }

  return (
    <>
      <div
        className="profileBackdrop"
        onMouseDown={(event) => {
          if (
            event.target ===
            event.currentTarget
          ) {
            onClose();
          }
        }}
      >
        <div className="profileModal">
          {/* ================================================= */}
          {/* HEADER */}
          {/* ================================================= */}

          <div className="profileHeader">
            <div>
              <div className="profileEyebrow">
                <Target size={14} />

                PERSONAL CARBON
                PROFILE
              </div>

              <h2>
                Build your weekly
                baseline
              </h2>

              <p>
                Use your real activity
                data, then tell
                PlanetPulse how much
                of that pattern you
                actually expect next
                week.
              </p>
            </div>

            <button
              className="profileClose"
              onClick={onClose}
              aria-label="Close"
            >
              <X size={19} />
            </button>
          </div>

          {/* ================================================= */}
          {/* CLARIFICATION */}
          {/* ================================================= */}

          <div className="baselineNotice">
            <div className="noticeIcon">
              <Info size={17} />
            </div>

            <div>
              <strong>
                Historical activity ≠
                future prediction
              </strong>

              <p>
                A busy week should not
                automatically become
                your next week's budget.
                Choose how much of this
                pattern you expect to
                continue.
              </p>
            </div>
          </div>

          {/* ================================================= */}
          {/* CONTENT */}
          {/* ================================================= */}

          <div className="profileContent">
            {/* ================================================= */}
            {/* TRANSPORT */}
            {/* ================================================= */}

            <section className="profileSection">
              <div className="profileSectionHeader">
                <div>
                  <h3>
                    Transport baseline
                  </h3>

                  <p>
                    Describe the travel
                    pattern you're using
                    as your reference.
                  </p>
                </div>

                <button
                  className="profileAddBtn"
                  onClick={addVehicle}
                >
                  <Plus size={15} />

                  Add vehicle
                </button>
              </div>

              {/* PERIOD */}

              <div className="periodBox">
                <div className="periodTitle">
                  <CalendarDays
                    size={15}
                  />

                  <span>
                    When does this
                    travel data
                    represent?
                  </span>
                </div>

                <div className="periodOptions">
                  <button
                    className={
                      transportPeriod ===
                      "typical_week"
                        ? "periodOption active"
                        : "periodOption"
                    }
                    onClick={() => {
                      setTransportPeriod(
                        "typical_week"
                      );

                      setTransportStartDate(
                        ""
                      );

                      setTransportEndDate(
                        ""
                      );
                    }}
                  >
                    <strong>
                      Typical week
                    </strong>

                    <span>
                      Your normal
                      recurring pattern
                    </span>
                  </button>

                  <button
                    className={
                      transportPeriod ===
                      "last_7_days"
                        ? "periodOption active"
                        : "periodOption"
                    }
                    onClick={() =>
                      setTransportPeriod(
                        "last_7_days"
                      )
                    }
                  >
                    <strong>
                      Last 7 days
                    </strong>

                    <span>
                      Actual recent
                      activity
                    </span>
                  </button>

                  <button
                    className={
                      transportPeriod ===
                      "last_30_days"
                        ? "periodOption active"
                        : "periodOption"
                    }
                    onClick={() =>
                      setTransportPeriod(
                        "last_30_days"
                      )
                    }
                  >
                    <strong>
                      Last 30 days
                    </strong>

                    <span>
                      Smoothed weekly
                      equivalent
                    </span>
                  </button>
                </div>

                {transportPeriod !==
                  "typical_week" && (
                  <div className="dateFields">
                    <div className="profileField">
                      <label>
                        From
                      </label>

                      <input
                        type="date"
                        value={
                          transportStartDate
                        }
                        onChange={(
                          event
                        ) =>
                          setTransportStartDate(
                            event.target
                              .value
                          )
                        }
                      />
                    </div>

                    <div className="profileField">
                      <label>
                        To
                      </label>

                      <input
                        type="date"
                        value={
                          transportEndDate
                        }
                        onChange={(
                          event
                        ) =>
                          setTransportEndDate(
                            event.target
                              .value
                          )
                        }
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* VEHICLES */}

              <div className="vehicleList">
                {vehicles.map(
                  (vehicle) => {
                    const Icon =
                      ICONS[
                        vehicle.kind
                      ];

                    return (
                      <div
                        className="vehicleCard"
                        key={
                          vehicle.id
                        }
                      >
                        <div className="vehicleTitle">
                          <div className="vehicleIcon">
                            <Icon
                              size={17}
                            />
                          </div>

                          <div>
                            <strong>
                              {
                                VEHICLES[
                                  vehicle.kind
                                ].label
                              }
                            </strong>

                            <span>
                              {
                                VEHICLES[
                                  vehicle.kind
                                ].factor
                              }{" "}
                              kg CO₂/km
                            </span>
                          </div>

                          {vehicles.length >
                            1 && (
                            <button
                              className="vehicleDelete"
                              onClick={() =>
                                removeVehicle(
                                  vehicle.id
                                )
                              }
                            >
                              <X
                                size={15}
                              />
                            </button>
                          )}
                        </div>

                        <div className="vehicleFields">
                          <div className="profileField">
                            <label>
                              Vehicle
                            </label>

                            <select
                              value={
                                vehicle.kind
                              }
                              onChange={(
                                event
                              ) =>
                                updateVehicle(
                                  vehicle.id,
                                  "kind",
                                  event
                                    .target
                                    .value
                                )
                              }
                            >
                              {Object.entries(
                                VEHICLES
                              ).map(
                                ([
                                  key,
                                  data,
                                ]) => (
                                  <option
                                    key={
                                      key
                                    }
                                    value={
                                      key
                                    }
                                  >
                                    {
                                      data.label
                                    }
                                  </option>
                                )
                              )}
                            </select>
                          </div>

                          <div className="profileField">
                            <label>
                              Trips / week
                            </label>

                            <input
                              type="number"
                              min="0"
                              value={
                                vehicle.trips
                              }
                              onChange={(
                                event
                              ) =>
                                updateVehicle(
                                  vehicle.id,
                                  "trips",
                                  event
                                    .target
                                    .value
                                )
                              }
                            />
                          </div>

                          <div className="profileField">
                            <label>
                              Km / trip
                            </label>

                            <input
                              type="number"
                              min="0"
                              value={
                                vehicle.distance
                              }
                              onChange={(
                                event
                              ) =>
                                updateVehicle(
                                  vehicle.id,
                                  "distance",
                                  event
                                    .target
                                    .value
                                )
                              }
                            />
                          </div>
                        </div>

                        {vehicle.kind ===
                          "truck" && (
                          <div className="truckField">
                            <div className="profileField">
                              <label>
                                Payload
                                (tonnes)
                              </label>

                              <input
                                type="number"
                                min="0"
                                step="0.1"
                                value={
                                  vehicle.payload ??
                                  1
                                }
                                onChange={(
                                  event
                                ) =>
                                  updateVehicle(
                                    vehicle.id,
                                    "payload",
                                    event
                                      .target
                                      .value
                                  )
                                }
                              />
                            </div>

                            <p className="fieldHint">
                              Payload is
                              recorded for
                              context. The
                              current
                              simplified
                              factor is
                              applied per km.
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  }
                )}
              </div>

              {/* FUTURE FREQUENCY */}

              <div className="futureTravelBox">
                <div className="futureTravelHeader">
                  <div>
                    <strong>
                      How much of this
                      travel will happen
                      next week?
                    </strong>

                    <span>
                      This prevents an
                      unusually busy week
                      from inflating your
                      future budget.
                    </span>
                  </div>

                  <b>
                    {
                      expectedTravelPercent
                    }
                    %
                  </b>
                </div>

                <input
                  className="reductionSlider"
                  type="range"
                  min="0"
                  max="100"
                  step="10"
                  value={
                    expectedTravelPercent
                  }
                  onChange={(event) =>
                    setExpectedTravelPercent(
                      Number(
                        event.target
                          .value
                      )
                    )
                  }
                />

                <div className="sliderLabels">
                  <span>
                    0% — unusual / not
                    expected
                  </span>

                  <span>
                    100% — same pattern
                  </span>
                </div>

                <div className="futureTravelExample">
                  Example: if last week
                  had 50 car trips but
                  you expect only 20% of
                  that travel next week,
                  PlanetPulse uses roughly
                  10 equivalent trips for
                  the future baseline.
                </div>
              </div>
            </section>

            {/* ================================================= */}
            {/* ELECTRICITY */}
            {/* ================================================= */}

            <section className="profileSection">
              <div className="profileSectionHeader">
                <div>
                  <h3>
                    Home electricity
                  </h3>

                  <p>
                    Use actual bill data
                    whenever possible.
                  </p>
                </div>

                <div className="sectionIcon">
                  <Zap size={17} />
                </div>
              </div>

              <div className="periodBox">
                <div className="periodTitle">
                  <CalendarDays
                    size={15}
                  />

                  <span>
                    When is this
                    electricity usage
                    from?
                  </span>
                </div>

                <div className="periodOptions electricityOptions">
                  <button
                    className={
                      electricityPeriod ===
                      "last_bill"
                        ? "periodOption active"
                        : "periodOption"
                    }
                    onClick={() =>
                      setElectricityPeriod(
                        "last_bill"
                      )
                    }
                  >
                    <strong>
                      Last bill
                    </strong>

                    <span>
                      Most recent billing
                      period
                    </span>
                  </button>

                  <button
                    className={
                      electricityPeriod ===
                      "three_bill_average"
                        ? "periodOption active"
                        : "periodOption"
                    }
                    onClick={() =>
                      setElectricityPeriod(
                        "three_bill_average"
                      )
                    }
                  >
                    <strong>
                      3-bill average
                    </strong>

                    <span>
                      Smoother baseline
                    </span>
                  </button>

                  <button
                    className={
                      electricityPeriod ===
                      "estimated_monthly"
                        ? "periodOption active"
                        : "periodOption"
                    }
                    onClick={() =>
                      setElectricityPeriod(
                        "estimated_monthly"
                      )
                    }
                  >
                    <strong>
                      Estimated
                    </strong>

                    <span>
                      No bill data
                    </span>
                  </button>
                </div>

                {electricityPeriod !==
                  "estimated_monthly" && (
                  <div className="dateFields">
                    <div className="profileField">
                      <label>
                        Bill starts
                      </label>

                      <input
                        type="date"
                        value={
                          electricityStartDate
                        }
                        onChange={(
                          event
                        ) =>
                          setElectricityStartDate(
                            event.target
                              .value
                          )
                        }
                      />
                    </div>

                    <div className="profileField">
                      <label>
                        Bill ends
                      </label>

                      <input
                        type="date"
                        value={
                          electricityEndDate
                        }
                        onChange={(
                          event
                        ) =>
                          setElectricityEndDate(
                            event.target
                              .value
                          )
                        }
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="twoFields">
                <div className="profileField">
                  <label>
                    Electricity usage
                  </label>

                  <div className="inputWithUnit">
                    <input
                      type="number"
                      min="0"
                      value={
                        monthlyKwh
                      }
                      onChange={(
                        event
                      ) =>
                        setMonthlyKwh(
                          Number(
                            event.target
                              .value
                          ) || 0
                        )
                      }
                    />

                    <span>
                      kWh
                    </span>
                  </div>
                </div>

                <div className="profileField">
                  <label>
                    People sharing
                    electricity
                  </label>

                  <div className="inputWithIcon">
                    <Users size={16} />

                    <input
                      type="number"
                      min="1"
                      value={
                        householdSize
                      }
                      onChange={(
                        event
                      ) =>
                        setHouseholdSize(
                          Math.max(
                            1,
                            Number(
                              event.target
                                .value
                            ) || 1
                          )
                        )
                      }
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* ================================================= */}
            {/* REDUCTION */}
            {/* ================================================= */}

            <section className="profileSection">
              <div className="profileSectionHeader">
                <div>
                  <h3>
                    Personal target
                  </h3>

                  <p>
                    Set a reduction
                    goal against your
                    future baseline.
                  </p>
                </div>

                <strong className="reductionValue">
                  {reduction}%
                </strong>
              </div>

              <input
                className="reductionSlider"
                type="range"
                min="0"
                max="50"
                step="5"
                value={reduction}
                onChange={(event) =>
                  setReduction(
                    Number(
                      event.target
                        .value
                    )
                  )
                }
              />

              <div className="sliderLabels">
                <span>
                  Same as baseline
                </span>

                <span>
                  50% lower
                </span>
              </div>
            </section>

            {/* ================================================= */}
            {/* RESULT */}
            {/* ================================================= */}

            <section className="profileResult">
              <div className="resultTop">
                <div>
                  <span>
                    FUTURE BASELINE
                  </span>

                  <strong>
                    {baseline.toFixed(
                      1
                    )}{" "}
                    kg
                    <small>
                      / week
                    </small>
                  </strong>
                </div>

                <div className="resultArrow">
                  →
                </div>

                <div>
                  <span>
                    PERSONAL TARGET
                  </span>

                  <strong>
                    {weeklyBudget.toFixed(
                      1
                    )}{" "}
                    kg
                    <small>
                      / week
                    </small>
                  </strong>
                </div>
              </div>

              <div className="resultBreakdown">
                <span>
                  Transport{" "}
                  <b>
                    {weeklyTransport.toFixed(
                      1
                    )}{" "}
                    kg
                  </b>
                </span>

                <span>
                  Electricity{" "}
                  <b>
                    {weeklyElectricity.toFixed(
                      1
                    )}{" "}
                    kg
                  </b>
                </span>
              </div>

              <div className="baselineMeta">
                <span>
                  Transport:{" "}
                  {transportPeriod ===
                  "typical_week"
                    ? "Typical week"
                    : transportPeriod ===
                        "last_7_days"
                      ? "Last 7 days"
                      : "Last 30 days"}
                </span>

                {transportStartDate &&
                  transportEndDate && (
                    <span>
                      {formatDate(
                        transportStartDate
                      )}{" "}
                      →{" "}
                      {formatDate(
                        transportEndDate
                      )}
                    </span>
                  )}

                <span>
                  Expected travel:{" "}
                  {
                    expectedTravelPercent
                  }
                  %
                </span>

                <span>
                  Electricity:{" "}
                  {electricityPeriod ===
                  "last_bill"
                    ? "Last bill"
                    : electricityPeriod ===
                        "three_bill_average"
                      ? "3-bill average"
                      : "Estimated monthly"}
                </span>
              </div>
            </section>

            {/* ================================================= */}
            {/* MESSAGE */}
            {/* ================================================= */}

            {message && (
              <div className="profileError">
                {message}
              </div>
            )}
          </div>

          {/* ================================================= */}
          {/* FOOTER */}
          {/* ================================================= */}

          <div className="profileFooter">
            <span>
              Your baseline stores
              both the source period
              and expected future
              usage.
            </span>

            <button
              className="profileSaveBtn"
              onClick={saveProfile}
            >
              <Save size={16} />

              Save & apply
            </button>
          </div>
        </div>
      </div>

      {/* ===================================================== */}
      {/* STYLES */}
      {/* ===================================================== */}

      <style jsx global>{`
        .profileBackdrop {
          position: fixed;
          inset: 0;
          z-index: 9999;

          display: flex;
          align-items: center;
          justify-content: center;

          padding: 20px;

          background: rgba(
            0,
            8,
            6,
            0.78
          );

          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(
            14px
          );

          overflow-y: auto;
        }

        .profileModal {
          width: min(
            800px,
            100%
          );

          max-height: min(
            900px,
            calc(100vh - 40px)
          );

          display: flex;
          flex-direction: column;

          overflow: hidden;

          border: 1px solid
            rgba(
              120,
              255,
              190,
              0.14
            );

          border-radius: 22px;

          background:
            linear-gradient(
              145deg,
              rgba(
                11,
                28,
                23,
                0.98
              ),
              rgba(
                5,
                16,
                13,
                0.99
              )
            );

          box-shadow:
            0 30px 100px
              rgba(
                0,
                0,
                0,
                0.55
              ),
            inset 0 1px 0
              rgba(
                255,
                255,
                255,
                0.04
              );

          color: inherit;
        }

        .profileHeader {
          display: flex;
          justify-content: space-between;

          gap: 20px;

          padding: 25px 26px 20px;

          border-bottom: 1px solid
            rgba(
              255,
              255,
              255,
              0.07
            );

          flex-shrink: 0;
        }

        .profileEyebrow {
          display: flex;
          align-items: center;

          gap: 7px;

          margin-bottom: 7px;

          font-size: 10px;
          font-weight: 800;

          letter-spacing: 0.13em;

          color: rgba(
            150,
            255,
            194,
            0.8
          );
        }

        .profileHeader h2 {
          margin: 0;

          font-size: clamp(
            22px,
            4vw,
            29px
          );

          line-height: 1.1;

          letter-spacing: -0.03em;
        }

        .profileHeader p {
          max-width: 570px;

          margin: 8px 0 0;

          font-size: 13px;

          line-height: 1.55;

          color: rgba(
            235,
            255,
            247,
            0.58
          );
        }

        .profileClose {
          width: 38px;
          height: 38px;

          flex: 0 0 38px;

          display: grid;
          place-items: center;

          border: 1px solid
            rgba(
              255,
              255,
              255,
              0.08
            );

          border-radius: 11px;

          background: rgba(
            255,
            255,
            255,
            0.035
          );

          color: rgba(
            255,
            255,
            255,
            0.65
          );

          cursor: pointer;

          transition: 0.2s ease;
        }

        .profileClose:hover {
          background: rgba(
            255,
            255,
            255,
            0.08
          );

          color: white;
        }

        .baselineNotice {
          display: flex;

          gap: 11px;

          margin: 16px 26px 0;

          padding: 12px 14px;

          border: 1px solid
            rgba(
              120,
              255,
              180,
              0.1
            );

          border-radius: 12px;

          background: rgba(
            120,
            255,
            180,
            0.035
          );
        }

        .noticeIcon {
          width: 30px;
          height: 30px;

          flex: 0 0 30px;

          display: grid;
          place-items: center;

          border-radius: 8px;

          background: rgba(
            120,
            255,
            180,
            0.07
          );

          color: rgba(
            175,
            255,
            205,
            0.8
          );
        }

        .baselineNotice strong {
          display: block;

          font-size: 11px;
        }

        .baselineNotice p {
          margin: 3px 0 0;

          font-size: 10px;

          line-height: 1.5;

          color: rgba(
            235,
            255,
            247,
            0.48
          );
        }

        .profileContent {
          padding: 16px 26px 24px;

          overflow-y: auto;

          overscroll-behavior: contain;
        }

        .profileContent::-webkit-scrollbar {
          width: 5px;
        }

        .profileContent::-webkit-scrollbar-thumb {
          border-radius: 10px;

          background: rgba(
            150,
            255,
            194,
            0.18
          );
        }

        .profileSection {
          padding: 18px;

          border: 1px solid
            rgba(
              255,
              255,
              255,
              0.07
            );

          border-radius: 16px;

          background: rgba(
            255,
            255,
            255,
            0.025
          );
        }

        .profileSection
          + .profileSection {
          margin-top: 12px;
        }

        .profileSectionHeader {
          display: flex;

          align-items: center;

          justify-content: space-between;

          gap: 15px;

          margin-bottom: 14px;
        }

        .profileSectionHeader h3 {
          margin: 0;

          font-size: 15px;

          letter-spacing: -0.01em;
        }

        .profileSectionHeader p {
          margin: 4px 0 0;

          font-size: 11px;

          line-height: 1.45;

          color: rgba(
            235,
            255,
            247,
            0.48
          );
        }

        .profileAddBtn {
          display: inline-flex;

          align-items: center;
          justify-content: center;

          gap: 6px;

          min-height: 34px;

          padding: 0 11px;

          border: 1px solid
            rgba(
              150,
              255,
              194,
              0.14
            );

          border-radius: 9px;

          background: rgba(
            120,
            255,
            180,
            0.055
          );

          color: rgba(
            185,
            255,
            211,
            0.9
          );

          font-size: 11px;
          font-weight: 700;

          cursor: pointer;
        }

        .periodBox {
          padding: 12px;

          margin-bottom: 12px;

          border: 1px solid
            rgba(
              255,
              255,
              255,
              0.06
            );

          border-radius: 12px;

          background: rgba(
            0,
            0,
            0,
            0.11
          );
        }

        .periodTitle {
          display: flex;

          align-items: center;

          gap: 7px;

          margin-bottom: 10px;

          font-size: 10px;

          font-weight: 700;

          color: rgba(
            235,
            255,
            247,
            0.7
          );
        }

        .periodTitle svg {
          color: rgba(
            160,
            255,
            195,
            0.7
          );
        }

        .periodOptions {
          display: grid;

          grid-template-columns:
            repeat(
              3,
              minmax(0, 1fr)
            );

          gap: 7px;
        }

        .periodOption {
          min-width: 0;

          padding: 10px;

          text-align: left;

          border: 1px solid
            rgba(
              255,
              255,
              255,
              0.065
            );

          border-radius: 9px;

          background: rgba(
            255,
            255,
            255,
            0.018
          );

          color: inherit;

          cursor: pointer;

          transition: 0.18s ease;
        }

        .periodOption:hover {
          background: rgba(
            255,
            255,
            255,
            0.04
          );
        }

        .periodOption.active {
          border-color: rgba(
            140,
            255,
            190,
            0.28
          );

          background: rgba(
            100,
            255,
            160,
            0.07
          );

          box-shadow:
            inset 0 0 0 1px
              rgba(
                100,
                255,
                160,
                0.04
              );
        }

        .periodOption strong {
          display: block;

          font-size: 10px;

          color: rgba(
            255,
            255,
            255,
            0.84
          );
        }

        .periodOption span {
          display: block;

          margin-top: 3px;

          font-size: 8px;

          line-height: 1.35;

          color: rgba(
            235,
            255,
            247,
            0.4
          );
        }

        .dateFields {
          display: grid;

          grid-template-columns:
            repeat(
              2,
              minmax(0, 1fr)
            );

          gap: 9px;

          margin-top: 10px;
        }

        .vehicleList {
          display: grid;

          gap: 10px;
        }

        .vehicleCard {
          min-width: 0;

          padding: 13px;

          border: 1px solid
            rgba(
              255,
              255,
              255,
              0.065
            );

          border-radius: 13px;

          background: rgba(
            0,
            0,
            0,
            0.12
          );
        }

        .vehicleTitle {
          display: flex;

          align-items: center;

          gap: 9px;

          margin-bottom: 12px;
        }

        .vehicleIcon {
          width: 31px;
          height: 31px;

          display: grid;

          place-items: center;

          flex: 0 0 31px;

          border-radius: 8px;

          background: rgba(
            120,
            255,
            180,
            0.07
          );

          color: rgba(
            170,
            255,
            205,
            0.85
          );
        }

        .vehicleTitle strong {
          display: block;

          font-size: 12px;
        }

        .vehicleTitle span {
          display: block;

          margin-top: 2px;

          font-size: 9px;

          color: rgba(
            235,
            255,
            247,
            0.4
          );
        }

        .vehicleDelete {
          margin-left: auto;

          width: 28px;
          height: 28px;

          display: grid;

          place-items: center;

          border: 0;

          border-radius: 7px;

          background: transparent;

          color: rgba(
            255,
            255,
            255,
            0.35
          );

          cursor: pointer;
        }

        .vehicleFields {
          display: grid;

          grid-template-columns:
            minmax(0, 1.5fr)
            minmax(0, 1fr)
            minmax(0, 1fr);

          gap: 9px;
        }

        .truckField {
          max-width: 240px;

          margin-top: 9px;
        }

        .fieldHint {
          margin: 6px 0 0;

          font-size: 9px;

          line-height: 1.45;

          color: rgba(
            235,
            255,
            247,
            0.35
          );
        }

        .profileField {
          min-width: 0;
        }

        .profileField label {
          display: block;

          margin-bottom: 5px;

          font-size: 9px;

          font-weight: 700;

          letter-spacing: 0.04em;

          text-transform: uppercase;

          color: rgba(
            235,
            255,
            247,
            0.45
          );
        }

        .profileField input,
        .profileField select {
          box-sizing: border-box;

          width: 100%;

          min-width: 0;

          height: 38px;

          padding: 0 10px;

          border: 1px solid
            rgba(
              255,
              255,
              255,
              0.08
            );

          outline: none;

          border-radius: 8px;

          background: rgba(
            0,
            0,
            0,
            0.2
          );

          color: rgba(
            255,
            255,
            255,
            0.88
          );

          font: inherit;

          font-size: 11px;
        }

        .profileField input:focus,
        .profileField select:focus {
          border-color: rgba(
            140,
            255,
            190,
            0.35
          );

          box-shadow:
            0 0 0 3px
              rgba(
                120,
                255,
                180,
                0.045
              );
        }

        .profileField option {
          background: #0b1713;

          color: white;
        }

        .twoFields {
          display: grid;

          grid-template-columns:
            repeat(
              2,
              minmax(0, 1fr)
            );

          gap: 10px;
        }

        .inputWithUnit,
        .inputWithIcon {
          position: relative;

          display: flex;

          align-items: center;
        }

        .inputWithUnit input {
          padding-right: 42px;
        }

        .inputWithUnit span {
          position: absolute;

          right: 10px;

          font-size: 10px;

          color: rgba(
            235,
            255,
            247,
            0.4
          );
        }

        .inputWithIcon svg {
          position: absolute;

          left: 10px;

          color: rgba(
            180,
            255,
            210,
            0.45
          );
        }

        .inputWithIcon input {
          padding-left: 34px;
        }

        /*
         * ===================================================
         * FUTURE TRAVEL BOX
         * ===================================================
         */

        .futureTravelBox {
          margin-top: 12px;

          padding: 14px;

          border: 1px solid
            rgba(
              140,
              255,
              190,
              0.11
            );

          border-radius: 13px;

          background:
            linear-gradient(
              135deg,
              rgba(
                90,
                255,
                155,
                0.045
              ),
              rgba(
                255,
                255,
                255,
                0.012
              )
            );
        }

        .futureTravelHeader {
          display: flex;

          justify-content: space-between;

          align-items: flex-start;

          gap: 15px;

          margin-bottom: 10px;
        }

        .futureTravelHeader strong {
          display: block;

          font-size: 11px;
        }

        .futureTravelHeader span {
          display: block;

          margin-top: 3px;

          font-size: 9px;

          line-height: 1.4;

          color: rgba(
            235,
            255,
            247,
            0.42
          );
        }

        .futureTravelHeader b {
          font-size: 18px;

          color: rgba(
            175,
            255,
            205,
            0.9
          );
        }

        .futureTravelExample {
          margin-top: 10px;

          padding: 8px 9px;

          border-radius: 8px;

          background: rgba(
            255,
            255,
            255,
            0.025
          );

          font-size: 9px;

          line-height: 1.5;

          color: rgba(
            235,
            255,
            247,
            0.42
          );
        }

        .reductionValue {
          min-width: 45px;

          text-align: right;

          font-size: 17px;

          color: rgba(
            175,
            255,
            205,
            0.9
          );
        }

        .reductionSlider {
          width: 100%;

          height: 5px;

          margin: 5px 0 0;

          accent-color: #8effb4;

          cursor: pointer;
        }

        .sliderLabels {
          display: flex;

          justify-content: space-between;

          gap: 10px;

          margin-top: 7px;

          font-size: 9px;

          color: rgba(
            235,
            255,
            247,
            0.35
          );
        }

        .profileResult {
          margin-top: 12px;

          padding: 17px;

          border: 1px solid
            rgba(
              140,
              255,
              190,
              0.12
            );

          border-radius: 15px;

          background:
            linear-gradient(
              135deg,
              rgba(
                90,
                255,
                155,
                0.055
              ),
              rgba(
                255,
                255,
                255,
                0.018
              )
            );
        }

        .resultTop {
          display: grid;

          grid-template-columns:
            minmax(0, 1fr)
            auto
            minmax(0, 1fr);

          align-items: center;

          gap: 14px;
        }

        .resultTop
          > div:not(
            .resultArrow
          ) {
          min-width: 0;
        }

        .resultTop span {
          display: block;

          margin-bottom: 5px;

          font-size: 8px;

          font-weight: 800;

          letter-spacing: 0.1em;

          color: rgba(
            235,
            255,
            247,
            0.4
          );
        }

        .resultTop strong {
          display: block;

          font-size: 20px;

          letter-spacing: -0.03em;
        }

        .resultTop small {
          margin-left: 4px;

          font-size: 10px;

          font-weight: 500;

          color: rgba(
            235,
            255,
            247,
            0.4
          );
        }

        .resultArrow {
          font-size: 20px;

          color: rgba(
            170,
            255,
            200,
            0.45
          );
        }

        .resultBreakdown {
          display: flex;

          flex-wrap: wrap;

          gap: 8px;

          margin-top: 13px;

          padding-top: 11px;

          border-top: 1px solid
            rgba(
              255,
              255,
              255,
              0.06
            );
        }

        .resultBreakdown span {
          padding: 5px 8px;

          border-radius: 6px;

          background: rgba(
            255,
            255,
            255,
            0.035
          );

          font-size: 9px;

          color: rgba(
            235,
            255,
            247,
            0.45
          );
        }

        .resultBreakdown b {
          color: rgba(
            255,
            255,
            255,
            0.78
          );
        }

        .baselineMeta {
          display: flex;

          flex-wrap: wrap;

          gap: 6px;

          margin-top: 10px;
        }

        .baselineMeta span {
          padding: 5px 7px;

          border-radius: 6px;

          background: rgba(
            255,
            255,
            255,
            0.025
          );

          font-size: 8px;

          color: rgba(
            235,
            255,
            247,
            0.35
          );
        }

        .profileError {
          margin-top: 10px;

          padding: 9px 11px;

          border: 1px solid
            rgba(
              255,
              100,
              100,
              0.15
            );

          border-radius: 8px;

          background: rgba(
            255,
            80,
            80,
            0.06
          );

          font-size: 10px;

          color: rgba(
            255,
            170,
            170,
            0.9
          );
        }

        .profileFooter {
          display: flex;

          align-items: center;

          justify-content: space-between;

          gap: 15px;

          padding: 16px 26px;

          border-top: 1px solid
            rgba(
              255,
              255,
              255,
              0.07
            );

          flex-shrink: 0;
        }

        .profileFooter > span {
          font-size: 9px;

          color: rgba(
            235,
            255,
            247,
            0.35
          );
        }

        .profileSaveBtn {
          display: inline-flex;

          align-items: center;

          justify-content: center;

          gap: 7px;

          min-height: 39px;

          padding: 0 15px;

          border: 0;

          border-radius: 9px;

          background:
            linear-gradient(
              135deg,
              #9dffc0,
              #63e999
            );

          color: #07120d;

          font-size: 11px;

          font-weight: 800;

          cursor: pointer;

          box-shadow:
            0 7px 25px
              rgba(
                80,
                240,
                140,
                0.12
              );
        }

        .profileSaveBtn:hover {
          transform: translateY(-1px);
        }

        @media (max-width: 680px) {
          .profileBackdrop {
            align-items: flex-start;

            padding: 10px;
          }

          .profileModal {
            max-height: calc(
              100vh - 20px
            );

            border-radius: 17px;
          }

          .profileHeader {
            padding: 19px 18px 16px;
          }

          .baselineNotice {
            margin-left: 18px;
            margin-right: 18px;
          }

          .profileContent {
            padding: 14px;
          }

          .profileFooter {
            padding: 13px 14px;
          }

          .profileFooter > span {
            display: none;
          }

          .profileSaveBtn {
            width: 100%;
          }

          .periodOptions {
            grid-template-columns: 1fr;
          }

          .vehicleFields {
            grid-template-columns:
              1fr 1fr;
          }

          .vehicleFields
            .profileField:first-child {
            grid-column: 1 / -1;
          }

          .twoFields {
            grid-template-columns: 1fr;
          }

          .resultTop {
            grid-template-columns: 1fr;

            gap: 8px;
          }

          .resultArrow {
            display: none;
          }

          .resultTop strong {
            font-size: 18px;
          }
        }

        @media (max-width: 390px) {
          .profileHeader h2 {
            font-size: 21px;
          }

          .profileSection {
            padding: 13px;
          }

          .profileSectionHeader {
            align-items: flex-start;
          }

          .profileAddBtn {
            flex-shrink: 0;
          }

          .vehicleFields {
            grid-template-columns: 1fr;
          }

          .vehicleFields
            .profileField:first-child {
            grid-column: auto;
          }

          .dateFields {
            grid-template-columns: 1fr;
          }

          .futureTravelHeader {
            gap: 8px;
          }
        }
      `}</style>
    </>
  );
}