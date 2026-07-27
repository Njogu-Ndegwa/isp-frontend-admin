// ─── Segment counter (mirrors backend logic) ──────────────────────────────
const GSM7_BASIC =
  '@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞ\x1bÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?' +
  '¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà';
const GSM7_EXT = new Set(['^', '{', '}', '[', '~', ']', '|', '€', '\\']);

function isGsm7(text: string): boolean {
  for (const ch of text) {
    if (!GSM7_BASIC.includes(ch) && !GSM7_EXT.has(ch)) return false;
  }
  return true;
}

function charCount(text: string): number {
  let count = 0;
  for (const ch of text) {
    count += GSM7_EXT.has(ch) ? 2 : 1;
  }
  return count;
}

export function calcSegments(text: string): {
  segments: number;
  chars: number;
  maxPerSegment: number;
  isGsm: boolean;
} {
  if (!text) return { segments: 0, chars: 0, maxPerSegment: 160, isGsm: true };
  const gsm = isGsm7(text);
  // For UCS-2, count Unicode code points ([...text]) not UTF-16 code units
  // (text.length), so supplementary-plane chars (emoji) match the backend's
  // Python len() and we don't overcount segments.
  const chars = gsm ? charCount(text) : [...text].length;
  const single = gsm ? 160 : 70;
  const multi = gsm ? 153 : 67;
  const segments = chars <= single ? 1 : Math.ceil(chars / multi);
  return { segments, chars, maxPerSegment: chars <= single ? single : multi, isGsm: gsm };
}
