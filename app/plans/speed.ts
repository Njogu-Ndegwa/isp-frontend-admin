/**
 * Plan speeds are written DOWNLOAD/UPLOAD ("5M/2M" = 5 Mbps download, 2 Mbps
 * upload). A single value ("5M") is the same speed both ways. The backend
 * converts this to RouterOS order (upload/download) when it sets up the
 * router, so the text here always reads the way customers are sold it.
 */

export interface PlanSpeed {
  download: string;
  upload: string;
}

const UNIT_LABEL: Record<string, string> = { K: 'Kbps', M: 'Mbps', G: 'Gbps' };

/** "5", "5M", "5 Mbps", "512k", "1.5M" -> "5 Mbps", "512 Kbps", "1.5 Mbps". */
function describePart(part: string): string | null {
  const match = part.trim().toUpperCase().replace(/\s+/g, '').match(/^(\d+(?:\.\d+)?)([KMG])?(?:BPS)?$/);
  if (!match) return null;
  const [, number, unit] = match;
  if (!unit) {
    // Bare numbers are Mbps, except raw bps values (e.g. 5000000) the backend
    // also accepts.
    const n = Number(number);
    if (n >= 1000) return `${(n / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 2 })} Mbps`;
    return `${number} Mbps`;
  }
  return `${number} ${UNIT_LABEL[unit]}`;
}

/** Reads a plan speed as download/upload, or null if it cannot be read. */
export function parsePlanSpeed(value: string | null | undefined): PlanSpeed | null {
  const text = String(value ?? '').trim();
  if (!text) return null;
  const parts = text.split('/');
  if (parts.length > 2) return null;
  const download = describePart(parts[0]);
  const upload = parts.length === 2 ? describePart(parts[1]) : download;
  if (!download || !upload) return null;
  return { download, upload };
}
