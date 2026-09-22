/*
 * Share-card generation (native Canvas 2D, no dependencies) and
 * per-platform share helpers. No backend exists in this app, so
 * sharing works via prefilled text + a generated image, never a
 * unique achievement URL.
 */

export type ShareBadge = {
  id: string;
  emoji: string;
  name: string;
  description: string;
  image: string;
};

export const APP_NAME = "CarbonPulse";
export const APP_URL = "https://planet-pulse-tau.vercel.app";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not load ${src}`));
    img.src = src;
  });
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
): number {
  const words = text.split(" ");
  let line = "";
  let curY = y;

  for (const word of words) {
    const test = `${line}${word} `;

    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line.trim(), x, curY);
      line = `${word} `;
      curY += lineHeight;
    } else {
      line = test;
    }
  }

  ctx.fillText(line.trim(), x, curY);

  return curY + lineHeight;
}

/* Renders a 1080x1080 shareable achievement card and returns a PNG data URL. */
export async function generateShareCardDataUrl(
  badge: ShareBadge,
  streakDays: number,
  displayName: string | null
): Promise<string> {
  const size = 1080;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  const gradient = ctx.createRadialGradient(
    size * 0.8,
    0,
    0,
    size * 0.5,
    size * 0.4,
    size
  );
  gradient.addColorStop(0, "#10281e");
  gradient.addColorStop(0.34, "#07100d");
  gradient.addColorStop(1, "#050b09");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = "rgba(167,243,107,0.25)";
  ctx.lineWidth = 3;
  ctx.strokeRect(24, 24, size - 48, size - 48);

  ctx.textAlign = "center";

  ctx.fillStyle = "#a7f36b";
  ctx.font = "700 32px Inter, ui-sans-serif, system-ui, sans-serif";
  ctx.fillText("🌱 CARBON PULSE", size / 2, 110);

  try {
    const img = await loadImage(badge.image);
    const imgSize = 320;
    ctx.drawImage(
      img,
      size / 2 - imgSize / 2,
      160,
      imgSize,
      imgSize
    );
  } catch {
    ctx.font = "220px sans-serif";
    ctx.fillText(badge.emoji, size / 2, 470);
  }

  ctx.fillStyle = "#eef7f1";
  ctx.font = "800 50px Inter, ui-sans-serif, system-ui, sans-serif";
  ctx.fillText(badge.name.toUpperCase(), size / 2, 570);

  let cursorY = 630;

  if (streakDays > 0) {
    ctx.fillStyle = "#ff8f82";
    ctx.font = "700 36px Inter, ui-sans-serif, system-ui, sans-serif";
    ctx.fillText(`🔥 ${streakDays} DAY STREAK`, size / 2, cursorY);
    cursorY += 70;
  }

  ctx.fillStyle = "#91a59b";
  ctx.font = "400 28px Inter, ui-sans-serif, system-ui, sans-serif";
  cursorY = wrapText(
    ctx,
    badge.description,
    size / 2,
    cursorY,
    760,
    36
  );

  ctx.fillStyle = "#a7f36b";
  ctx.font = "600 26px Inter, ui-sans-serif, system-ui, sans-serif";
  ctx.fillText("🌍 Every day counts.", size / 2, cursorY + 20);

  if (displayName) {
    ctx.fillStyle = "#71857d";
    ctx.font = "400 22px Inter, ui-sans-serif, system-ui, sans-serif";
    ctx.fillText(displayName, size / 2, cursorY + 62);
  }

  ctx.fillStyle = "#52665d";
  ctx.font = "600 20px Inter, ui-sans-serif, system-ui, sans-serif";
  ctx.fillText(
    `${APP_NAME} · ${APP_URL.replace("https://", "")}`,
    size / 2,
    size - 50
  );

  return canvas.toDataURL("image/png");
}

export async function dataUrlToFile(
  dataUrl: string,
  filename: string
): Promise<File> {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  return new File([blob], filename, { type: blob.type });
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  link.click();
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export type SharePlatform = "whatsapp" | "twitter" | "linkedin";

export function buildPlatformMessage(
  platform: SharePlatform,
  badge: ShareBadge,
  streakDays: number
): string {
  const streakLine =
    streakDays > 0
      ? `🔥 ${streakDays}-day carbon-reduction streak!\n\n`
      : "";

  switch (platform) {
    case "whatsapp":
      return `🌱 I just unlocked the ${badge.name} badge!\n\n${streakLine}I'm tracking and reducing my carbon footprint with ${APP_NAME}. 🌍\n\nEvery day counts.\n\n${APP_URL}`;

    case "twitter":
      return `${badge.emoji} I just unlocked the ${badge.name} badge!\n\n${
        streakDays > 0
          ? `🔥 ${streakDays} days of staying within my carbon budget.\n\n`
          : ""
      }Tracking my carbon footprint one day at a time. 🌍\n\n#CarbonTracker #Sustainability #ClimateAction`;

    case "linkedin":
      return `🌍 Just unlocked the ${badge.name} achievement!\n\n${
        streakDays > 0
          ? `I've maintained my personal carbon budget for ${streakDays} consecutive days.\n\n`
          : ""
      }Small daily actions can add up to meaningful environmental progress.\n\n#Sustainability #ClimateAction #CarbonFootprint`;
  }
}

export function whatsappShareUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function twitterShareUrl(text: string): string {
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    text
  )}`;
}

export function linkedinShareUrl(url: string): string {
  return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
    url
  )}`;
}

export type WebShareResult = "shared" | "cancelled" | "unsupported";

/* Native OS share sheet (WhatsApp/Instagram/etc all appear here on supporting devices). */
export async function shareViaWebShare(opts: {
  title: string;
  text: string;
  url?: string;
  file?: File;
}): Promise<WebShareResult> {
  if (typeof navigator === "undefined" || !navigator.share) {
    return "unsupported";
  }

  try {
    const data: ShareData & { files?: File[] } = {
      title: opts.title,
      text: opts.text,
      url: opts.url,
    };

    if (
      opts.file &&
      navigator.canShare &&
      navigator.canShare({ files: [opts.file] })
    ) {
      data.files = [opts.file];
    }

    await navigator.share(data);
    return "shared";
  } catch (error) {
    if ((error as Error).name === "AbortError") return "cancelled";
    return "unsupported";
  }
}
