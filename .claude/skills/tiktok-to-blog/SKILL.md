---
name: tiktok-to-blog
description: Create SEO blog posts for bitwavetechnologies.com/blog — from a TikTok video (URL or local file) or from scratch — under content/blog/, on its own branch with a PR for Dennis to verify before it publishes. Covers the full pipeline including professional 16:9 covers sourced from real Bitwave assets or free, high-quality licensed web images. Use when asked to write blog posts, convert TikTok content into blog posts, or grow the blog.
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

## Step 3 — Images (required: 1 professional cover + 0–2 in-context)

Every post ships a **16:9 cover** (`image:` frontmatter) plus up to 2 inline
images. The cover appears on the blog card grid, the article header, AND the
OG/WhatsApp link preview — in Kenya most distribution happens as WhatsApp
link cards, so a post without a cover is a post that doesn't get clicked.
Each image must show something the post is actually about. Never use
AI-generated decoration. **Quality, relevance, and professional suitability
outrank channel provenance.** A TikTok still or Biwavte-library photo gets no
automatic preference merely because it is ours; reject it when a free licensed
web image communicates the topic more clearly.

Build a shortlist from these source types when available. This is a candidate
set, not a strict priority order:

- **Free, high-resolution licensed web images** — actively search Pexels,
  Unsplash, and Wikimedia Commons for a professional, on-topic landscape
  image. This is a first-class source, not a last resort. Prefer an original at
  least 1200 px wide with clean focus, lighting, composition, and enough crop
  room for 16:9.
- **Real Bitwave UI screenshots or field photos** — use these when authenticity
  materially helps, especially for an exact dashboard feature, portal state,
  router installation, or local Kenyan context. Use demo/test data only —
  never expose a customer's name, number, payment, MAC address, or credentials.
- **The Biwavte photo library** —
  `C:\Biwavte-Content-Library\photo-library`. Read `INDEX.json` for subject,
  caption, quality, and privacy notes, but do not force a library image into a
  blog cover when it looks like a vertical social-video still rather than
  editorial photography.
- **Frames from the source TikTok** — keep media and use
  `python .claude/skills/tiktok-to-blog/extract_frames.py <video> <outdir> [seconds...]`
  only when a frame is genuinely sharp, well lit, caption-free in the final
  crop, and strong enough for a professional article card and WhatsApp preview.

Rules for web images:

- Open the original image page and verify that its licence permits commercial
  use. Do not rely on an image-search thumbnail or an unsourced repost.
- Prefer Pexels/Unsplash originals or Commons files under CC0/CC-BY. Follow any
  attribution requirement; reject editorial-only, watermarked, unclear, or
  AI-generated material.
- Download and self-host the selected file under
  `public/blog-images/<slug>/`; never hotlink. Record the image-page URL and
  licence URL/terms in an HTML comment next to the embed and in the review
  package or PR.
- Never use a competitor's screenshot or branding, and never imply that a
  stock scene is a real Bitwave customer, installation, network, or dashboard.

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

**Visual-quality gate — mandatory before accepting any cover:**

- Inspect the full source, the final 16:9 crop, and the crop displayed at
  roughly 360 px wide. File size and pixel dimensions are not proof of visual
  quality.
- Reject soft focus, motion blur, heavy backlighting or underexposure, tiny
  picture-in-picture interfaces, awkward face/device crops, burned-in
  captions, and any private identifier.
- Produce exactly **720×405** unless a genuinely sharp real source is smaller.
  Prefer source material at least 720 px wide; a real demo-UI screenshot should
  start at 1440×810 or larger. Never upscale a weak frame to pass a dimension
  check.
- Apply the same visual bar to every source. If a channel/library frame is not
  crisp and editorially suitable, search the licensed web sources before
  settling. Authenticity does not excuse a poor cover.
- Record the image-page or internal source, licence where applicable, source
  dimensions, output dimensions, a plain-language visual verdict, and why the
  selected image beat the other shortlisted candidates in the review package
  or PR description.
- When replacing a cover that has already been deployed, use a new filename
  (for example `cover-crisp.webp`) and update frontmatter. Reusing the old URL
  can leave Next.js or the CDN serving a stale optimized image after deploy.

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
