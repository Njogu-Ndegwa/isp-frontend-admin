/**
 * The reseller's own hero photo: what we accept, and how it is shrunk before
 * upload. Portal users pay for this image on metered connections before they
 * have bought a plan, so it is resized to the bundled presets' 828x410 and
 * re-encoded to about their size (25-66 KB).
 */

export const HERO_WIDTH = 828;
export const HERO_HEIGHT = 410;
/** What the portal may download. The backend's signed cap is 300 KB. */
export const HERO_TARGET_BYTES = 120 * 1024;
export const HERO_SOURCE_MAX_BYTES = 15 * 1024 * 1024;
export const HERO_SOURCE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const HERO_MIN_WIDTH = 400;
const HERO_MIN_HEIGHT = 200;
const QUALITIES = [0.78, 0.68, 0.58, 0.48, 0.38];

/** Why this file can't be used, or null. Runs before decoding it. */
export function checkHeroFile(file: { type: string; size: number }): string | null {
  if (!HERO_SOURCE_TYPES.includes(file.type)) return 'Use a JPG, PNG or WebP photo.';
  if (file.size <= 0) return 'That file is empty.';
  if (file.size > HERO_SOURCE_MAX_BYTES) {
    return `That photo is ${(file.size / (1024 * 1024)).toFixed(1)} MB. The limit is ${HERO_SOURCE_MAX_BYTES / (1024 * 1024)} MB.`;
  }
  return null;
}

export function checkHeroDimensions(width: number, height: number): string | null {
  if (width < HERO_MIN_WIDTH || height < HERO_MIN_HEIGHT) {
    return `That photo is too small (${width}x${height}). Use one at least ${HERO_MIN_WIDTH}x${HERO_MIN_HEIGHT}.`;
  }
  return null;
}

/** The centred part of a source image that fills the hero without stretching. */
export function coverCrop(width: number, height: number): { sx: number; sy: number; sw: number; sh: number } {
  const target = HERO_WIDTH / HERO_HEIGHT;
  if (width / height > target) {
    const sw = Math.round(height * target);
    return { sx: Math.round((width - sw) / 2), sy: 0, sw, sh: height };
  }
  const sh = Math.round(width / target);
  return { sx: 0, sy: Math.round((height - sh) / 2), sw: width, sh };
}

/**
 * True for a saved value that is an uploaded photo rather than a preset. Mirrors
 * the backend's is_portal_hero_url path shape.
 */
export function isUploadedHero(url: string | null | undefined): boolean {
  return !!url && /\/media\/c\/\d{4}\/\d{2}\/[A-Za-z0-9_-]+\.(?:jpg|webp)$/.test(url);
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("That file isn't a photo we can read. Try a JPG or PNG.")); };
    img.src = url;
  });
}

/**
 * Crop to the hero's shape and re-encode as JPEG, lowering quality until it fits.
 * JPEG rather than WebP because old phones reach captive portals too, and a
 * single file has no fallback. Also drops EXIF, including any GPS position.
 */
export async function compressHeroImage(file: File): Promise<File> {
  const img = await loadImage(file);
  const tooSmall = checkHeroDimensions(img.naturalWidth, img.naturalHeight);
  if (tooSmall) throw new Error(tooSmall);

  const canvas = document.createElement('canvas');
  canvas.width = HERO_WIDTH;
  canvas.height = HERO_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error("This browser can't prepare the photo. Try another browser.");
  // A transparent PNG would otherwise turn black as a JPEG.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, HERO_WIDTH, HERO_HEIGHT);
  ctx.imageSmoothingQuality = 'high';
  const { sx, sy, sw, sh } = coverCrop(img.naturalWidth, img.naturalHeight);
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, HERO_WIDTH, HERO_HEIGHT);

  let blob: Blob | null = null;
  for (const quality of QUALITIES) {
    blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
    if (blob && blob.size <= HERO_TARGET_BYTES) break;
  }
  if (!blob) throw new Error("This browser can't prepare the photo. Try another browser.");
  return new File([blob], 'hero.jpg', { type: 'image/jpeg' });
}
