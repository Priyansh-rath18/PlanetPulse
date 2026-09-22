"use client";

import { Lock, Trophy } from "lucide-react";
import type { BadgeStatus } from "../lib/badges";
import BadgeImage from "./BadgeImage";

type Props = {
  statuses: BadgeStatus[];
  monthlyStatuses: BadgeStatus[];
  monthProgress: {
    label: string;
    compliantDays: number;
    daysSoFar: number;
    totalDays: number;
  } | null;
  onSelect: (status: BadgeStatus) => void;
};

function formatEarnedDate(iso?: string): string {
  if (!iso) return "";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

function BadgeIcon({ status }: { status: BadgeStatus }) {
  return (
    <span className="badgeIconWrap">
      <BadgeImage
        src={status.image}
        emoji={status.emoji}
        className="badgeIconImg"
        fallbackClassName="badgeIconFallback"
      />
    </span>
  );
}

export default function Achievements({
  statuses,
  monthlyStatuses,
  monthProgress,
  onSelect,
}: Props) {
  const earnedCount = statuses.filter((s) => s.earned).length;

  return (
    <section className="panel achievementsPanel">
      <div className="panelHeader">
        <div>
          <span className="sectionLabel">ACHIEVEMENTS</span>
          <h2>
            <Trophy size={18} style={{ verticalAlign: "-3px" }} />{" "}
            Badges
          </h2>
        </div>

        <span className="status">
          {earnedCount} / {statuses.length} Earned
        </span>
      </div>

      <div className="badgeGrid">
        {statuses.map((status) => (
          <button
            type="button"
            key={status.id}
            className={
              status.earned
                ? "badgeCard badgeEarned"
                : "badgeCard badgeLocked"
            }
            onClick={() => status.earned && onSelect(status)}
            disabled={!status.earned}
          >
            {!status.earned && (
              <span className="badgeLockTag">
                <Lock size={11} />
              </span>
            )}

            <BadgeIcon status={status} />

            <strong>{status.name}</strong>

            <p>{status.description}</p>

            {status.earned ? (
              <span className="badgeEarnedDate">
                Earned {formatEarnedDate(status.earnedAt)}
              </span>
            ) : status.progress ? (
              <div className="badgeProgress">
                <div className="badgeProgressTrack">
                  <div
                    className="badgeProgressFill"
                    style={{
                      width: `${Math.min(
                        (status.progress.current /
                          status.progress.target) *
                          100,
                        100
                      )}%`,
                    }}
                  />
                </div>
                <span>
                  {status.progress.current} / {status.progress.target}
                </span>
              </div>
            ) : null}
          </button>
        ))}
      </div>

      {(monthlyStatuses.length > 0 || monthProgress) && (
        <div className="monthlyGuardianSection">
          <span className="sectionLabel">
            🛡️ MONTHLY GUARDIAN
          </span>

          <div className="badgeGrid">
            {monthlyStatuses.map((status) => (
              <button
                type="button"
                key={status.id}
                className="badgeCard badgeEarned"
                onClick={() => onSelect(status)}
              >
                <BadgeIcon status={status} />
                <strong>{status.name}</strong>
                <p>{status.description}</p>
                <span className="badgeEarnedDate">
                  Earned {formatEarnedDate(status.earnedAt)}
                </span>
              </button>
            ))}

            {monthProgress && (
              <div className="badgeCard badgeLocked badgeInProgress">
                <span className="badgeIconWrap">
                  <span className="badgeIconFallback">🛡️</span>
                </span>
                <strong>{monthProgress.label}</strong>
                <p>In progress this month</p>
                <div className="badgeProgress">
                  <div className="badgeProgressTrack">
                    <div
                      className="badgeProgressFill"
                      style={{
                        width: `${Math.min(
                          (monthProgress.compliantDays /
                            monthProgress.daysSoFar) *
                            100,
                          100
                        )}%`,
                      }}
                    />
                  </div>
                  <span>
                    {monthProgress.compliantDays} /{" "}
                    {monthProgress.daysSoFar} days so far
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
