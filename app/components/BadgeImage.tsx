"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  src: string;
  emoji: string;
  className: string;
  fallbackClassName: string;
};

/*
 * <img> with an emoji fallback. A plain onError handler alone misses
 * failures that resolve before hydration attaches the listener (the
 * image starts loading as soon as the server HTML is parsed), so this
 * also checks the already-resolved state on mount.
 */
export default function BadgeImage({
  src,
  emoji,
  className,
  fallbackClassName,
}: Props) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    const img = imgRef.current;

    if (img && img.complete && img.naturalWidth === 0) {
      setBroken(true);
    }
  }, [src]);

  if (broken) {
    return <span className={fallbackClassName}>{emoji}</span>;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={imgRef}
      src={src}
      alt=""
      className={className}
      onError={() => setBroken(true)}
    />
  );
}
