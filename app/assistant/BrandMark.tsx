'use client';

/*
 * The Bitwave logo, exactly as drawn: the original artwork on its white rounded
 * tile, only made larger inside the tile so it reads at small sizes
 * (public/brand/bitwave-mark.png, the same file as the app icon).
 *
 * `live` is the assistant's "working" sign: the logo breathes with a soft blue glow.
 * The artwork itself is never changed or animated apart.
 */
export function BrandMark({ size = 28, live = false, title }: { size?: number; live?: boolean; title?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/brand/bitwave-mark.png" width={size} height={size} alt={title ?? ''} aria-hidden={title ? undefined : true}
      draggable={false} className={`shrink-0 select-none ${live ? 'bm-live' : ''}`} style={{ width: size, height: size }} />
  );
}
