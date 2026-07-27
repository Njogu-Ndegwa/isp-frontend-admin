---
name: tiktok-to-blog
description: Create SEO blog posts for bitwavetechnologies.com/blog — from a TikTok video (URL or local file) or from scratch — under content/blog/, on its own branch with a PR for Dennis to verify before it publishes. Covers the full pipeline including 16:9 cover images sourced from the Biwavte photo library. Use when asked to write blog posts, convert TikTok content into blog posts, or grow the blog.
---

# TikTok → Blog pipeline

Converts a TikTok video into a reviewed blog post on bitwavetechnologies.com/blog.
The publish gate is the PR: nothing goes live until Dennis merges.

## Inputs

- One or more TikTok URLs (e.g. `https://www.tiktok.com/@user/video/123...`), or
- A local video/audio file path (fallback when TikTok blocks downloads).

## Step 1 — Get the transcript

Run the helper (installs `yt-dlp` and `faster-whisper` into the current Python
on first use; no system ffmpeg needed — faster-whisper bundles PyAV):

```
python .claude/skills/tiktok-to-blog/fetch_transcript.py <tiktok-url-or-file>
```

It prints JSON: `{"title", "description", "hashtags", "transcript"}`. It tries
TikTok's own captions first and falls back to local Whisper transcription
(small model, CPU). The script installs the PRE-RELEASE yt-dlp — the stable
build's TikTok extractor is frequently broken ("Unable to extract universal
data for rehydration", seen 2026-07-15). If a fetch still fails (403/login
wall), ask Dennis to save the video to disk (TikTok app → Save, or screen
record) and rerun with the file path; adding yt-dlp's `--cookies-from-browser
chrome` is another option but reads the browser's cookie store, so only with
Dennis's explicit go-ahead per run.

## Step 2 — Write the draft

Write `content/blog/<slug>.md` (frontmatter format: see `content/blog/README.md`).
The transcript is raw speech — the job is to turn it into a piece that ranks,
not to transcribe it prettily:

- Pick ONE search query a Kenyan hotspot/ISP operator would actually type
  (e.g. "mikrotik hotspot setup", "wifi billing system kenya", "pppoe vs hotspot").
  Put it in the title, the slug, the first paragraph, and one H2.
- 800–1500 words. Expand the video's points with concrete specifics (steps,
  KES prices, equipment names); cut filler and spoken-word repetition.
- Structure: short intro answering the query → H2 sections → a table or list
  where it helps → FAQ section with 2–3 long-tail questions → closing CTA
  linking to `/signup`.
- **Write for AI answer engines too** (ChatGPT search, Perplexity, Google AI
  Overviews) — they quote self-contained passages, so: answer each H2's
  question in its first 40–60 words before elaborating; phrase H2s as the
  questions people ask; keep the FAQ format exact (`## FAQ`, bold question
  line, answer paragraph) — it is auto-converted to FAQPage JSON-LD; use
  consistent entity names every time (Bitwave Technologies, M-Pesa, MikroTik,
  RouterOS — never abbreviations an engine can't link); include concrete,
  citable facts (KES prices, timeframes, model numbers) since engines prefer
  passages with specifics.
- Meta `description:` ≤ 155 chars, contains the keyword, reads like an answer.
- **Inline product CTAs, woven into the copy** (the strongest-evidenced blog
  conversion pattern — HubSpot measured 47–93% of blog leads from inline
  anchor-text links vs ~6% from end-of-post banners): mention Bitwave as the
  solution to the reader's problem within the first 3 paragraphs and link the
  natural phrase (e.g. "[connect your M-Pesa in minutes](/signup)",
  "[try the pricing calculator](/#pricing)") — 2–3 such links per post,
  never a bare "click here". The template already adds the end-of-post card;
  don't duplicate it in the body.
- Set `category:` to exactly one of `hotspot | mikrotik | mpesa | pppoe |
  business | comparison` (drives the card color and the
  `/blog/category/<key>` hub page; see `app/blog/categories.ts`).
- Link to at least one existing post in `content/blog/` when related.
- Keep Dennis's voice/claims from the video; do not invent numbers or
  testimonials. Anything uncertain gets a `<!-- VERIFY: ... -->` comment for
  him to check.
- Whisper mis-hears domain terms — correct against this glossary (verified on a
  real transcript 2026-07-15): "microtik"→MikroTik, "PBOE"→PPPoE,
  "haplight"→hAP lite, "hexiris"→hEX lite, "in drought hours"→RouterOS,
  "B12/BitWave platform"→Bitwave, "utwebtechnologies.com"/"B12 site"→
  bitwavetechnologies.com, "Winbox" spellings, "MPesa"→M-Pesa, "STK"→STK push.
- Frontmatter `date:` = today, `published: true` (the PR is the gate).

## Step 3 — Images (required: 1 cover + 0–2 in-context, never stock)

Every post ships a **16:9 cover** (`image:` frontmatter) plus up to 2 inline
images. The cover appears on the blog card grid, the article header, AND the
OG/WhatsApp link preview — in Kenya most distribution happens as WhatsApp
link cards, so a post without a cover is a post that doesn't get clicked.
Each image must show something the post is actually about — never stock
photos, never AI-generated decoration. Priority order for sourcing:

1. **The Biwavte photo library** — `C:\Biwavte-Content-Library\photo-library`
   (49 curated TikTok stills; categories `dennis/ dashboard/ equipment/
   props/ site/`). Read `INDEX.json` first and pick by `subject`/`context`;
   it marks which frames are CAPTION-FREE and which have burned-in captions
   (usually at ~72–78% frame height) or PRIVACY notes. This is the shared
   asset pool with the carousel pipeline — check it BEFORE extracting new
   frames so the whole content system reuses the same real photos.
2. **Frames from the source TikTok video** (when the library has nothing on
   point). Keep the downloaded media (`fetch_transcript.py <url> --keep-media
   <dir>`), then
   `python .claude/skills/tiktok-to-blog/extract_frames.py <video> <outdir> [seconds...]`
   — pick frames showing the router, Winbox, or the step being described.
   A good new frame is worth adding back to the photo library (with an
   INDEX.json entry) so future posts and carousels can reuse it.
3. **Real UI screenshots** taken with the browser/Playwright against the
   Bitwave dashboard, captive portal, or landing page at the exact step the
   text describes. Use demo/test data only — never a real customer's name,
   number, or payment; crop or blur anything doubtful.
4. **Field photos from Dennis** (router installs, antennas, shops) when he
   provides them.
5. **Openly-licensed web images — last resort** (Dennis approved 2026-07-21):
   when none of the above can show the subject (e.g. a device or setting we
   don't own — fibre spools, a Starlink dish, a matatu stage), search
   Unsplash / Pexels / Wikimedia Commons. Rules: verify the license allows
   commercial use (Unsplash and Pexels licenses do; on Commons prefer CC0 /
   CC-BY and add the required attribution in the image caption); **download
   the file and run it through `make_cover.py`** into
   `public/blog-images/<slug>/` — never hotlink, so pages stay self-hosted,
   cacheable and license-frozen; record the source URL + license in an HTML
   comment next to the embed; never use a competitor's screenshots or
   branding; and never present a stock photo as our own network, customer,
   or dashboard — anything claimed as Bitwave's must be a real Bitwave
   image.

**Make the cover** from the chosen frame:

```
python .claude/skills/tiktok-to-blog/make_cover.py <src> public/blog-images/<slug>/cover.webp --focus <0..1>
```

`--focus` sets the vertical center of the 16:9 band cut from the 9:16 frame —
pick it so the subject is centered and any caption band falls outside the crop
(faces ≈ 0.40, desk gear ≈ 0.60, devices in hands ≈ 0.62; the script warns if
the output exceeds the 150 KB budget). Then set frontmatter
`image: /blog-images/<slug>/cover.webp` and `imageAlt:` describing what it
shows. PRIVACY: never use frames whose INDEX entry says an MSISDN is visible
without blurring it first.

Inline images: save to `public/blog-images/<slug>/descriptive-name.webp`
(WebP, under ~150 KB — readers pay for data); embed with markdown
`![alt text](/blog-images/<slug>/name.webp)` where the alt text describes the
image and works the post's keyword in naturally; check every image reads at
360 px width. Images lazy-load automatically.

### Performance budget (readers are on cheap Androids paying $5–10/GB)

- **Delivery setup, for the record:** blog images are pre-optimized local
  WebP in `public/`, served from Vercel's edge CDN. There is NO Cloudinary
  for blog images (Cloudinary is only used for tutorial *videos* elsewhere
  in the app) and none is needed. Cover images render through `next/image`,
  which adds responsive srcset + AVIF via Vercel's optimizer on top of the
  already-small WebP. Inline markdown images bypass `next/image`, so their
  on-disk size IS what readers download — size them right.
- Covers: ≤ 720 px wide, aim under 30 KB (the current three are 6–19 KB);
  hard cap 150 KB (make_cover.py warns).
- Inline images: pre-size to the display width (~736 px max in the article
  column) — never commit a full-resolution frame.
- Whole-article target: all images combined under ~200 KB.
- Never add web fonts, carousels, or third-party embeds to blog pages; the
  blog ships one tiny client component (the share row) and should stay that
  way.

## Step 4 — Branch, PR, review

```
git checkout -b blog/<slug>
git add content/blog/<slug>.md public/blog-images/<slug>/
git commit -m "Blog draft: <title> (from TikTok)"
git push -u origin blog/<slug>
gh pr create --title "Blog draft: <title>" --body "<summary + source TikTok URL + keyword targeted>"
```

Dennis verifies/rectifies in the PR. Merging to the production branch deploys
it; the sitemap picks it up automatically.

## Ranking hygiene (once per session, not per post)

- Confirm the post URL renders locally: `npm run build` must pass.
- After a merge deploys, ping Google: submit the sitemap in Search Console
  (property: bitwavetechnologies.com).
