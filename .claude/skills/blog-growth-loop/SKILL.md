---
name: blog-growth-loop
description: Weekly loop that grows Bitwave's Google traffic from bitwavetechnologies.com/blog and the solution pages — pull Search Console numbers, judge last month's changes, rewrite titles that get seen but not clicked, strengthen pages stuck on page two, keep the scheduled-post queue topped up from Dennis's TikToks, and open ONE PR for him to merge. Use when asked to "run the SEO loop", "check how the blog is doing", "what should we post next on the blog", "learn from the blog's performance", "refresh the blog queue", or on the weekly schedule.
---

# Blog growth loop

The blog and the four solution pages exist to bring in **non-brand** Google
traffic: people searching for a problem who have never heard of Bitwave. Brand
searches ("bitwave technologies") already work and are not the goal. Every run
answers: what did Google show, what did people click, what do we change, what
goes out next.

Baseline and history: `docs/seo/2026-10-22-baseline.md`, `docs/seo/reports/`,
`docs/seo/experiments.md`. Read the latest report and the experiments log
before deciding anything.

## How publishing works (read once)

- Posts are `content/blog/<slug>.md`. A post with `published: true` and a
  `date:` in the future is **scheduled**: hidden from the index, category
  pages, sitemap, llms.txt and its own URL until that day in Kenya (UTC+3).
  Blog routes revalidate hourly, so it appears without a deploy
  (`isLive` in `app/blog/posts.ts`).
- So "the agent posts slowly" means: Dennis merges a reviewed batch once, and
  the dates drip it out. Cadence: **2 posts a week, Tuesday and Friday**.
  Never stack more than 2 on one week; never leave a week empty while the
  queue has posts.
- The PR is the gate. This loop opens PRs and **never merges**.
- Solution pages (`/hotspot-billing-system-kenya`, `/pppoe-billing-system-kenya`,
  `/mpesa-wifi-billing-kenya`, `/wifi-billing-system-kenya`) have their copy in
  `app/solutions/solutions.ts`.

## Step 1 — Get the numbers

Preferred: the API script (needs the service-account key, see its header):

```
GSC_SERVICE_ACCOUNT_JSON=<path> node scripts/seo/gsc-report.mjs
```

It writes `docs/seo/snapshots/<date>.json` and `docs/seo/reports/<date>.md`
with the rules already applied (title rewrites, striking distance, no
traction, new topics, queue).

No key yet? Read the Search Console UI in Chrome (Dennis is signed in as
dnjogu118@gmail.com; Claude in Chrome tools). Recipe that worked 2026-10-22:
open
`https://search.google.com/search-console/performance/search-analytics?resource_id=sc-domain%3Abitwavetechnologies.com&num_of_days=28`,
add `&page=*%2Fblog` to filter to the blog, and collect each tab (QUERIES,
PAGES, DAYS) with a javascript_tool loop that reads the visible table's
`tbody tr` cells and clicks the visible `[aria-label="Next page"]` until it is
disabled. Return results in chunks (the tool truncates long output). Write the
numbers into a report by hand in the same shape as the script's.

Signups by landing page (optional, needs Dennis's OK to read production
read-only via `accessing-production-server`): signups store their first touch
in `users.acquisition_details` (`landing_path`, `referrer`, utm fields). Count
by `acquisition_details->>'landing_path'` for paths under `/blog/` and the
solution pages, referrer `google`. A post that brings signups outranks a post
that only brings clicks.

## Step 2 — Judge last month's experiments

For each row in `docs/seo/experiments.md` whose "Judge on" date has passed,
fill in Result from the report (clicks, CTR, position vs "Before"). Note what
the result teaches in one line — e.g. "question-form titles beat statement
titles for how-to queries". Those lessons steer the next rewrites.

## Step 3 — Decide the changes (cap: 3 page edits a week)

In priority order:

1. **Title rewrite** (high impressions, page one, CTR < 2%): rewrite the
   frontmatter `title` and `description` (or the solution page's
   `metaTitle`/`metaDescription`) to match the wording of the top query and put
   the answer or a number in it. Change only title+description, add `updated:`
   with today's date, and log an experiment row.
2. **Striking distance** (pos 8–20): answer the top query in the first 60
   words, add the missing subsection the query implies, and link to the page
   from two related posts. Log it.
3. **No traction after 45 days**: retarget to a query with demand (one that
   shows up in the report's "topics" list or in our TikTok comments), or fold
   it into a stronger post with a redirect. Ask Dennis before deleting
   anything.
4. **Facts drift**: competitor prices in `comparison` posts go stale. Re-check
   their pricing pages every 2 months and update with the date checked.

Never change the slug of a post that already gets impressions.

## Step 4 — Keep the queue full

Count scheduled posts (report's "Publishing queue"). If fewer than 4 remain:

- Pick topics from, in order: the report's "topics the market is asking for";
  TikToks with high views on a searchable question
  (`C:\Biwavte-Content-Library\ALL-POSTS.md`, `published-posts.json` for
  URLs); gaps competitors cover (fyberpay `/blog/guides/*`, centipid blog).
  Check `content/blog/` so no two posts target the same query.
- Write them with the `tiktok-to-blog` skill (transcript, cover from the photo
  library, VERIFY comments for anything unconfirmed).
- Give each a date continuing the Tuesday/Friday cadence after the last
  scheduled post.

## Step 5 — One PR

Branch from the latest `origin/master` (`branch-from-latest-remote` skill),
commit by path (never `git add .`), push, and open one PR titled
`SEO loop <date>: <n> edits, <m> new posts`. Body: the report's headline
numbers, each change with its reason (rule + numbers), the new posts with
their publish dates and target queries, and every `<!-- VERIFY -->` that
needs Dennis. Also commit the report and the experiments log.

## Step 6 — After Dennis merges

Nothing to do for scheduled posts; they appear on their dates. When the merge
changes titles or solution pages, request indexing for those URLs in Search
Console's URL Inspection (Chrome) so the test starts now, not in two weeks.

## Guardrails

- Quality over count: 2 good posts a week beats 10 thin ones. Mass-produced
  pages are what Google's scaled-content policy demotes, site-wide. Every post
  starts from Dennis's own video, data or field experience.
- Never invent numbers, prices, testimonials or competitor facts. Unsure →
  `<!-- VERIFY: … -->` and list it in the PR.
- No customer names, phone numbers, router IDs or server details in public
  posts, even when a skill or transcript contains them.
- Don't touch brand-query pages (homepage) beyond what an experiment row
  justifies.
