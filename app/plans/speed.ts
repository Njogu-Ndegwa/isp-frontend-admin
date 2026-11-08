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

// Same spellings the backend accepts (mikrotik_api.parse_speed_to_mikrotik):
// 5M, 5MB, 5MBS, 5MBPS, 5MBIT, 5MBITS, 5MPS, 512K, 512KBPS, .5M. Matched on
// the upper-cased, space-free text after "/s" has been folded into "PS".
const PART_RE = /^(\d+(?:\.\d+)?|\.\d+)(?:([KMG])(?:B|BIT|BITS)?(?:PS|S)?|BPS)?$/;
// "5mb/s", "5 Mbit/s": that "/s" means per second, not download/upload.
// (No lookbehind: older iOS Safari cannot parse it.)
const PER_SECOND_RE = /([KMGBT])\s*\/\s*S(?![A-Z0-9])/gi;

/** "5", "5M", "5 Mbps", "5mbs", "512k", "1.5M" -> "5 Mbps", "512 Kbps", "1.5 Mbps". */
function describePart(part: string): string | null {
  const match = part.trim().toUpperCase().replace(/\s+/g, '').match(PART_RE);
  if (!match) return null;
  const [, rawNumber, unit] = match;
  const number = rawNumber.startsWith('.') ? `0${rawNumber}` : rawNumber;
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
  // A trailing "/" ("5M/5/") is a typo, not a third side.
  const text = String(value ?? '').trim().replace(PER_SECOND_RE, '$1PS').replace(/\/+\s*$/, '').trim();
  if (!text) return null;
  const parts = text.split('/');
  if (parts.length > 2) return null;
  const download = describePart(parts[0]);
  const upload = parts.length === 2 ? describePart(parts[1]) : download;
  if (!download || !upload) return null;
  return { download, upload };
}

export const PLAN_SPEED_HELP = 'Use a speed like 5M or 5M/2M (download/upload).';

/**
 * Why a plan speed cannot be saved, or null when it can. The backend refuses
 * the same values; checking here keeps the reseller on the form. Unreadable
 * speeds used to be saved and given 10 Mbps on the router ("5mbs", 8 Nov 2026).
 */
export function planSpeedError(value: string | null | undefined): string | null {
  return parsePlanSpeed(value) ? null : PLAN_SPEED_HELP;
}
