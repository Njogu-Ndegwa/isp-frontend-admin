---
name: tiktok-to-blog
description: Turn a TikTok video (URL or local file) into an SEO blog post draft under content/blog/, on its own branch with a PR for Dennis to verify before it publishes. Use when asked to convert TikTok content into blog posts, create blog drafts from videos, or grow the bitwavetechnologies.com blog.
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
(small model, CPU). If TikTok blocks the download (403/login wall), ask Dennis
to save the video to disk (TikTok app → Save, or screen record) and rerun with
the file path.

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
- Meta `description:` ≤ 155 chars, contains the keyword, reads like an answer.
- Link to at least one existing post in `content/blog/` when related.
- Keep Dennis's voice/claims from the video; do not invent numbers or
  testimonials. Anything uncertain gets a `<!-- VERIFY: ... -->` comment for
  him to check.
- Frontmatter `date:` = today, `published: true` (the PR is the gate).

## Step 3 — Branch, PR, review

```
git checkout -b blog/<slug>
git add content/blog/<slug>.md
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
