"use client";

import { useEffect, useState } from "react";
import {
  Check,
  Copy,
  Download,
  Instagram,
  Link2,
  MessageCircle,
  Share2,
  X,
} from "lucide-react";
import type { ShareBadge } from "../lib/shareCard";
import {
  APP_URL,
  buildPlatformMessage,
  copyText,
  dataUrlToFile,
  downloadDataUrl,
  generateShareCardDataUrl,
  linkedinShareUrl,
  shareViaWebShare,
  twitterShareUrl,
  whatsappShareUrl,
} from "../lib/shareCard";

type Props = {
  badge: ShareBadge | null;
  streakDays: number;
  displayName: string;
  onDisplayNameChange: (value: string) => void;
  showName: boolean;
  onShowNameChange: (value: boolean) => void;
  onClose: () => void;
};

export default function ShareModal({
  badge,
  streakDays,
  displayName,
  onDisplayNameChange,
  showName,
  onShowNameChange,
  onClose,
}: Props) {
  const [cardUrl, setCardUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [nativeAvailable, setNativeAvailable] = useState(false);

  useEffect(() => {
    setNativeAvailable(
      typeof navigator !== "undefined" && !!navigator.share
    );
  }, []);

  useEffect(() => {
    if (!badge) {
      setCardUrl(null);
      return;
    }

    let cancelled = false;

    generateShareCardDataUrl(
      badge,
      streakDays,
      showName && displayName ? displayName : null
    )
      .then((url) => {
        if (!cancelled) setCardUrl(url);
      })
      .catch(() => {
        if (!cancelled) setCardUrl(null);
      });

    return () => {
      cancelled = true;
    };
  }, [badge, streakDays, showName, displayName]);

  if (!badge) return null;

  async function handleCopyLink() {
    const message = buildPlatformMessage(
      "whatsapp",
      badge as ShareBadge,
      streakDays
    );

    const ok = await copyText(message);

    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  async function handleNativeShare() {
    const message = buildPlatformMessage(
      "whatsapp",
      badge as ShareBadge,
      streakDays
    );

    let file: File | undefined;

    if (cardUrl) {
      try {
        file = await dataUrlToFile(
          cardUrl,
          `${(badge as ShareBadge).id}-achievement.png`
        );
      } catch {
        file = undefined;
      }
    }

    await shareViaWebShare({
      title: `${(badge as ShareBadge).name} — ${APP_URL.replace(
        "https://",
        ""
      )}`,
      text: message,
      url: APP_URL,
      file,
    });
  }

  function handleInstagram() {
    if (cardUrl) {
      downloadDataUrl(
        cardUrl,
        `${(badge as ShareBadge).id}-achievement.png`
      );
    }
    // No public web intent exists for posting to Instagram directly;
    // downloading the card + native share sheet (above) is the
    // supported path on mobile.
    handleNativeShare();
  }

  return (
    <div
      className="modalBackdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="modal shareModal">
        <div className="modalTop">
          <div>
            <span className="sectionLabel">SHARE</span>
            <h2>🎉 Achievement</h2>
          </div>

          <button
            className="iconBtn"
            onClick={onClose}
            aria-label="Close"
          >
            <X />
          </button>
        </div>

        <div className="shareCardPreview">
          {cardUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cardUrl} alt="Achievement card preview" />
          ) : (
            <div className="shareCardLoading">
              Generating card…
            </div>
          )}
        </div>

        <label className="shareNameToggle">
          <input
            type="checkbox"
            checked={showName}
            onChange={(event) =>
              onShowNameChange(event.target.checked)
            }
          />
          Show my name on the achievement card
        </label>

        {showName && (
          <input
            type="text"
            className="shareNameInput"
            placeholder="Your display name (optional)"
            value={displayName}
            maxLength={40}
            onChange={(event) =>
              onDisplayNameChange(event.target.value)
            }
          />
        )}

        <span className="sectionLabel shareGridLabel">
          Share your achievement
        </span>

        <div className="shareGrid">
          <a
            className="shareBtn"
            href={whatsappShareUrl(
              buildPlatformMessage(
                "whatsapp",
                badge as ShareBadge,
                streakDays
              )
            )}
            target="_blank"
            rel="noopener noreferrer"
          >
            <MessageCircle size={20} />
            WhatsApp
          </a>

          <button
            type="button"
            className="shareBtn"
            onClick={handleInstagram}
          >
            <Instagram size={20} />
            Instagram
          </button>

          <a
            className="shareBtn"
            href={twitterShareUrl(
              buildPlatformMessage(
                "twitter",
                badge as ShareBadge,
                streakDays
              )
            )}
            target="_blank"
            rel="noopener noreferrer"
          >
            𝕏 X
          </a>

          <a
            className="shareBtn"
            href={linkedinShareUrl(APP_URL)}
            target="_blank"
            rel="noopener noreferrer"
          >
            in LinkedIn
          </a>

          <button
            type="button"
            className="shareBtn"
            onClick={handleCopyLink}
          >
            {copied ? <Check size={20} /> : <Copy size={20} />}
            {copied ? "Copied!" : "Copy Link"}
          </button>

          {cardUrl && (
            <button
              type="button"
              className="shareBtn"
              onClick={() =>
                downloadDataUrl(
                  cardUrl,
                  `${(badge as ShareBadge).id}-achievement.png`
                )
              }
            >
              <Download size={20} />
              Download
            </button>
          )}

          {nativeAvailable && (
            <button
              type="button"
              className="shareBtn"
              onClick={handleNativeShare}
            >
              <Share2 size={20} />
              More…
            </button>
          )}
        </div>

        <p className="shareNote">
          <Link2 size={12} />
          Instagram and LinkedIn don&apos;t support pre-filled posts
          from a website — download the card and post it directly, or
          use your device&apos;s share sheet.
        </p>
      </div>
    </div>
  );
}
