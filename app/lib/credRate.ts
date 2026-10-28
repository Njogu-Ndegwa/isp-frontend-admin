// Access-credential (free code) speed limits.
//
// The backend stores a credential's rate_limit in RouterOS order,
// UPLOAD/DOWNLOAD ("5M/2M" = 5 Mbps up, 2 Mbps down), and sends it to the
// router as-is. A free-text box let resellers save "50/10" (RouterOS reads
// that as 50 bit/s) and "5m/2m" (RouterOS rejects lowercase m). The forms now
// take two Mbps numbers and send a normalised string built here.

export interface CredRateMbps {
  download: string;
  upload: string;
}

const UNIT_MBPS: Record<string, number> = { '': 1, K: 0.001, M: 1, G: 1000 };

/** One side of a stored rate ("5M", "512k", "5000000", "50") as Mbps text. */
function partToMbps(part: string): string {
  const match = part.trim().toUpperCase().replace(/\s+/g, '').match(/^(\d+(?:\.\d+)?)([KMG])?(?:BPS)?$/);
  if (!match) return '';
  const value = Number(match[1]);
  let unit = match[2] ?? '';
  // A bare number of 1000+ is raw bps, as RouterOS prints it. A smaller one is
  // what the reseller meant in Mbps.
  if (!unit && value >= 1000) {
    return trimNumber(value / 1_000_000);
  }
  if (!unit) unit = 'M';
  return trimNumber(value * UNIT_MBPS[unit]);
}

function trimNumber(value: number): string {
  return String(Number(value.toFixed(3)));
}

/** Split a stored "upload/download" rate into Mbps fields for the form. */
export function parseCredRate(rate: string | null | undefined): CredRateMbps {
  if (!rate || !rate.trim()) return { download: '', upload: '' };
  const parts = rate.split('/');
  const upload = partToMbps(parts[0] ?? '');
  const download = parts.length > 1 ? partToMbps(parts[1]) : upload;
  return { download, upload };
}

export type BuildCredRateResult =
  | { ok: true; rate: string | null }
  | { ok: false; error: string };

function validMbps(text: string): number | null {
  const value = Number(text);
  if (!text.trim() || !Number.isFinite(value) || value <= 0 || value > 10000) return null;
  return value;
}

/**
 * Build the RouterOS "upload/download" string from the Mbps fields.
 * Both empty = unlimited (null). One filled in = same speed both ways.
 */
export function buildCredRate(download: string, upload: string): BuildCredRateResult {
  const down = download.trim();
  const up = upload.trim();
  if (!down && !up) return { ok: true, rate: null };
  const downValue = validMbps(down || up);
  const upValue = validMbps(up || down);
  if (downValue === null || upValue === null) {
    return { ok: false, error: 'Speed must be a number of Mbps above 0, e.g. 5 or 2.5' };
  }
  return { ok: true, rate: `${trimNumber(upValue)}M/${trimNumber(downValue)}M` };
}

/** Compact label for a stored rate: "↓5 ↑2 Mbps" or "Unlimited". */
export function formatCredRate(rate: string | null | undefined): string {
  const { download, upload } = parseCredRate(rate);
  if (!download && !upload) return rate ? rate : 'Unlimited';
  return `↓${download || '?'} ↑${upload || '?'} Mbps`;
}
