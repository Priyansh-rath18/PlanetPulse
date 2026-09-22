"use client";

import { useMemo } from "react";
import { Share2, X } from "lucide-react";
import BadgeImage from "./BadgeImage";
import { useReducedMotion } from "../lib/useReducedMotion";

export type BadgeModalData = {
  id: string;
  emoji: string;
  name: string;
  description: string;
  image: string;
  earnedAt: string;
  mode: "unlock" | "view";
};

type Props = {
  badge: BadgeModalData | null;
  streakDays: number;
  onClose: () => void;
  onShare: () => void;
};

const CONFETTI_COLORS = [
  "#a7f36b",
  "#66d68a",
  "#ff8f82",
  "#eef7f1",
  "#4ed7a3",
];

export default function BadgeModal({
  badge,
  streakDays,
  onClose,
  onShare,
}: Props) {
  const reducedMotion = useReducedMotion();

  const particles = useMemo(
    () =>
      Array.from({ length: 24 }, (_, index) => ({
        id: index,
        left: Math.random() * 100,
        delay: Math.random() * 0.4,
        duration: 1.1 + Math.random() * 0.8,
        color:
          CONFETTI_COLORS[
            index % CONFETTI_COLORS.length
          ],
        rotate: Math.random() * 360,
      })),
    [badge?.id]
  );

  if (!badge) return null;

  const isUnlock = badge.mode === "unlock";

  return (
    <div
      className="modalBackdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className={
          isUnlock ? "modal badgeModal unlockMode" : "modal badgeModal"
        }
      >
        <button
          className="iconBtn badgeModalClose"
          onClick={onClose}
          aria-label="Close"
        >
          <X />
        </button>

        {isUnlock && !reducedMotion && (
          <div className="confettiField" aria-hidden="true">
            {particles.map((particle) => (
              <span
                key={particle.id}
                className="confettiPiece"
                style={{
                  left: `${particle.left}%`,
                  animationDelay: `${particle.delay}s`,
                  animationDuration: `${particle.duration}s`,
                  background: particle.color,
                  transform: `rotate(${particle.rotate}deg)`,
                }}
              />
            ))}
          </div>
        )}

        {isUnlock && (
          <span className="sectionLabel badgeModalEyebrow">
            🎉 BADGE UNLOCKED!
          </span>
        )}

        <div
          className={
            reducedMotion
              ? "badgeArtwork"
              : isUnlock
              ? "badgeArtwork scaleIn"
              : "badgeArtwork"
          }
        >
          <BadgeImage
            src={badge.image}
            emoji={badge.emoji}
            className="badgeArtworkImg"
            fallbackClassName="badgeArtworkFallback"
          />
        </div>

        <h2 className="badgeModalName">
          {badge.emoji} {badge.name}
        </h2>

        <p className="badgeModalDesc">{badge.description}</p>

        {streakDays > 0 && (
          <span className="status badgeModalStreak">
            🔥 {streakDays} Day Streak
          </span>
        )}

        {!isUnlock && (
          <span className="badgeModalEarnedAt">
            Earned{" "}
            {new Intl.DateTimeFormat("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            }).format(new Date(badge.earnedAt))}
          </span>
        )}

        <div className="badgeModalActions">
          <button
            type="button"
            className="primaryBtn wide"
            onClick={onShare}
          >
            <Share2 size={16} />
            Share Achievement
          </button>

          {isUnlock && (
            <button
              type="button"
              className="secondaryBtn wide"
              onClick={onClose}
            >
              View Badges
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
