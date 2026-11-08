---
name: blog-growth-loop
description: Weekly loop that grows Bitwave's Google traffic from bitwavetechnologies.com/blog and the solution pages — pull Search Console numbers, judge last month's changes on a scorecard (clicks, signups, activated and paying resellers), track the buyer queries and who holds page one for them, rewrite titles that get seen but not clicked, strengthen pages stuck on page two, earn backlinks, keep the scheduled-post queue topped up from Dennis's TikToks, and open ONE PR for him to merge. Use when asked to "run the SEO loop", "check how the blog is doing", "what should we post next on the blog", "learn from the blog's performance", "refresh the blog queue", "get backlinks", or on the weekly schedule.
---

# Blog growth loop

The blog and the four solution pages exist to bring in **non-brand** Google
traffic that turns into **signups and then active resellers**: people who run,
or want to run, a hotspot or PPPoE business, searching for a problem, who have
never heard of Bitwave. Brand searches ("bitwave technologies") already work
and are not the goal. Every run answers: what did Google show, what did people
click, who signed up, who started using Bitwave, what do we change, what goes
out next, and who new links to us.

Baseline and history: `docs/seo/2026-10-22-baseline.md`, `docs/seo/reports/`,
`docs/seo/experiments.md`, `docs/seo/backlinks.md`. Read the latest report, the
experiments log and the backlink log before deciding anything.

## The scorecard (how every page and experiment is judged)

Score each page on this ladder, highest rung reached first. Every rung is
progress; a higher rung is worth more than any amount of a lower one.

| Rung | Signal | Where it comes from |
|---|---|---|
| 1 | Impressions and position, above all on the buyer queries below | Search Console |
| 2 | Clicks | Search Console |
| 3 | **Signups** whose first landing was the page | production `users.acquisition_details` |
| 4 | **Activated**: the signup added a router | production `routers` |
| 5 | **Paying**: their customers paid through us, or they paid our subscription | production `customer_payments`, `subscription_payments` |

A page that brings signups is a good page. If its signups stall at rung 3,
that's a lead to improve, not a failure: check whether the readers are WiFi
operators (Step 3's audience rule), and tell Dennis so onboarding can follow up
with those signups.

Also record these when they move, because they predict the ladder:

- **Links earned** by the page (Step 6) and **AI answers** that cite it
  (Step 4). These are what lift rungs 1–2 over the following months.
- **Clicks from the page to `/signup`, `/demo` or `/pricing`**, if the site's
  analytics (GA4) can be read. That shows intent before a signup happens.
- **Time from signup to first router**, for activated signups. A page whose
  readers activate in days is bringing better-fit resellers than one whose
  readers take weeks.

## The buyer queries

These are the searches a reseller types when shopping for billing software.
Ranking for them is the real goal; everything else feeds them. Track every one
in every report, even when it has no impressions (write "not shown"):

| Query | Our page for it |
|---|---|
| wifi billing system kenya | `/wifi-billing-system-kenya` |
| hotspot billing system kenya | `/hotspot-billing-system-kenya` |
| mikrotik hotspot billing (+ "mpesa") | none yet: needs a page |
| mpesa wifi billing | `/mpesa-wifi-billing-kenya` |
| isp billing system kenya / isp billing software kenya | homepage + `/blog/best-isp-billing-system-kenya-2026` |
| pppoe billing system kenya | `/pppoe-billing-system-kenya` |
| best isp billing system kenya | `/blog/best-isp-billing-system-kenya-2026` |
| wifi voucher system kenya | `/blog/wifi-voucher-system-kenya` |

Add a query to this table when Search Console shows a new buying query
("billing", "software", "system", a competitor's name) with real impressions.
Two pages must never target the same query.

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
- **If a batch's dates have passed before it merges, re-date it onto the next
  free Tuesday/Friday slots.** Do not compress it to one post a day: that is
  what emptied the queue on 23 Nov 2026, three weeks after a batch planned to
  last until 18 Dec.
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

Faster recipe (2026-11-08): add `&metrics=CLICKS%2CIMPRESSIONS%2CCTR%2CPOSITION`
so the table carries position, set "Rows per page" to 500 (click the listbox,
then the `500` option), and read every `tbody tr` in one javascript_tool call.
`&breakdown=date` with `&num_of_months=6` gives the daily table for month-on-
month totals. `&query=*bitwave` filters to brand queries; whole-site minus
brand is the non-brand trend.

Also record:

- **Every buyer query** from the table above: impressions, position, which of
  our URLs Google showed.
- **Brand vs non-brand clicks** for the month, so growth in brand searches is
  not mistaken for SEO progress.
- **Links**: Search Console → Links → "Top linking sites". Copy the count and
  any new sites into `docs/seo/backlinks.md` (Step 6).

### Signups and activation by landing page (every run)

This fills rungs 3–5 of the scorecard. On 2026-11-08 seven signups had landed
first on a blog page and none had yet added a router or taken a payment, which
the experiments log couldn't see because it only counted signups. So every run
checks signups *and* activation, read-only, via
`accessing-production-server` (ask Dennis once per run if he hasn't approved
production reads in this session). Report counts only: no emails, names or
user ids in the report or PR.

```sql
select acquisition_details->>'landing_path' as landed,
       count(*) as signups,
       count(*) filter (where exists (select 1 from routers r where r.user_id = u.id)) as added_router,
       count(*) filter (where exists (select 1 from customer_payments p
                        where p.reseller_id = u.id and p.status::text ilike 'complete%')) as took_payment,
       count(*) filter (where exists (select 1 from subscription_payments s
                        where s.user_id = u.id and s.status::text ilike 'complete%')) as paid_us
from users u
where u.role::text = 'RESELLER'
  and u.created_at >= now() - interval '90 days'
  and (acquisition_details->>'landing_path' like '/blog%'
       or acquisition_details->>'landing_path' like '%-billing-%'
       or acquisition_details->>'landing_path' = '/')
group by 1 order by 2 desc;
```

Compare each page against the all-signups benchmark (same query without the
`landing_path` filter; on 2026-11-08 it was 35% added a router, 30% took a
payment, 19% paid us). Rank pages by the scorecard: paying, then activated,
then signups, then clicks. A page whose signups activate well below the
benchmark may be reaching the wrong reader; check it with Step 3's
"audience" rule, and list those signups (as a count) for Dennis's onboarding
follow-up.

Attribution is first-touch with a 90-day cookie, so a reader who later signs up
on another device is lost. Say so when a page's sample is under ~10 signups.

## Step 2 — Judge last month's experiments

For each row in `docs/seo/experiments.md` whose "Judge on" date has passed,
fill in Result from the report on the scorecard: clicks, CTR, position vs
"Before", signups, activated and paying. State the highest rung the change
moved ("won on clicks and signups; activation not yet"). Note what the result
teaches in one line, e.g.
"question-form titles beat statement titles for how-to queries". Those lessons
steer the next rewrites.

## Step 3 — Decide the changes (cap: 3 page edits a week)

In priority order:

1. **Buyer query on page two or not shown**: the page that owns it (table
   above) gets the work first, ahead of any blog post. Answer the query in the
   first 60 words, take the page to 1,500+ words of real substance (setup
   steps, KES prices, real dashboard screenshots, FAQ), and link to it from
   two related posts with the query as anchor text. If no page owns it, the
   next new post is that page. Log it.
2. **Title rewrite** (high impressions, page one, CTR < 2%): **first open the
   QUERIES tab filtered to that page.** If most impressions are brand queries
   (Google showing the post as a sitelink under the homepage), the low CTR is
   expected; leave the title alone. Otherwise rewrite the frontmatter `title`
   and `description` (or the solution page's `metaTitle`/`metaDescription`) to
   match the wording of the top query and put the answer or a number in it.
   Change only title+description, add `updated:` with today's date, and log an
   experiment row.
3. **Striking distance** (pos 8–20): answer the top query in the first 60
   words, add the missing subsection the query implies, and link to the page
   from two related posts. Log it.
4. **Audience check** (a page whose signups activate well below the
   benchmark, or a post answering an end-user question, e.g. the smart TV
   post): keep the traffic and signups, and make sure operators find their
   way. Add a short boxed section for operators ("Run a hotspot? …") that
   links to the matching solution page, make the signup CTAs speak to
   operators, and tell end users plainly when they don't need an account.
   Log it.
5. **Strong post, no money link**: any post with 200+ impressions in 28 days
   that does not link to a solution page gets one link from its body, anchored
   on that page's buyer query.
6. **No traction after 45 days**: retarget to a query with demand (one that
   shows up in the report's "topics" list or in our TikTok comments), or fold
   it into a stronger post with a redirect. Ask Dennis before deleting
   anything.
7. **Facts drift**: competitor prices in `comparison` posts go stale. Re-check
   their pricing pages every 2 months and update with the date checked.

Never change the slug of a post that already gets impressions.

## Step 4 — Who holds page one (monthly, first run of the month)

Search Google from Kenya for each buyer query
(`https://www.google.com/search?q=<query>&gl=ke&hl=en&num=20`, Claude in
Chrome; read `a h3` titles and their links with javascript_tool) and record
the top 10 in the report. If Google shows a CAPTCHA or "unusual traffic" page,
stop and note it; never try to get past it. From the results:

- **Every competitor on page one that we have no `bitwave-vs-<name>` post
  for is a comparison-post candidate.** On 2026-11-08 that was Kamwifi,
  Mobilink, wifi.co.ke, Centipid, Iterative Billing, NextFi, Ndovu Connect and
  WayaDesk (we had Netily, Jasiyo, Pawa). Comparison posts must be factual,
  dated, sourced from the competitor's own public pages, and fair.
- Note what the winners have that our page lacks (length, a calculator,
  screenshots, a video, a pricing table, a keyword domain). Steer Step 3's
  first rule with it.
- Note "best X in Kenya" listicles on page one written by someone who is not a
  competitor. Those authors are outreach targets for Step 6.

### AI answers (same monthly run)

Resellers also ask ChatGPT, Claude, Perplexity, Gemini and DeepSeek "what's the
best hotspot billing system in Kenya?". The site's technical side is done
(`app/llms.txt`, AI crawlers allowed by name in `app/robots.ts`, FAQPage
JSON-LD), so what decides whether we're named is **how many other sites
mention Bitwave**, which is Step 6's work. Measure it:

- Ask Perplexity (no login needed) and, where Dennis is signed in, ChatGPT
  (search on), Claude, Gemini and DeepSeek the same three questions, word for
  word:
  1. "What is the best hotspot billing system in Kenya for MikroTik with M-Pesa?"
  2. "Which ISP billing software should a small Kenyan ISP use?"
  3. "Bitwave Technologies billing system: is it any good?"
- Log in `docs/seo/ai-answers.md`, one row per engine and question: date,
  whether Bitwave is named (and in which position), which competitors are
  named, and **which sources the answer cites**. Cited sources we're missing
  from become Step 6 outreach targets: an AI tool repeats the pages it
  trusts, so getting onto those pages is how we get into the answer.
- Also note Search Console's "Generative AI" report (linked from the
  Performance page) if it shows data for the site.
- Asking a chatbot questions is fine. Never post, comment or create accounts
  on Dennis's behalf while doing it.

ChatGPT search and Copilot answer from **Bing's** index, so the site must
also be verified in Bing Webmaster Tools with the sitemap submitted. If it
isn't, list that as a task for Dennis in the PR (he signs in; the agent
doesn't).

## Step 5 — Keep the queue full

Count scheduled posts (report's "Publishing queue"). If fewer than 4 remain:

- **Audience mix.** For each candidate topic ask: who types this into
  Google, someone who runs or wants to run a WiFi business, or someone who
  only buys WiFi? Keep most posts operator topics, because operators are who
  activate. End-user topics (e.g. "how to pay wifi on smart tv") are welcome:
  they bring the most clicks and some signups. Keep them to about **1 in 4**
  posts and give each the operator box from Step 3's audience rule.
- Pick topics from, in order:
  1. a buyer query with no owning page, or stuck on page two (table above);
  2. a `bitwave-vs-<competitor>` post for a page-one competitor we haven't
     covered (Step 4);
  3. the report's "topics the market is asking for";
  4. TikToks with high views on a searchable question
     (`C:\Biwavte-Content-Library\ALL-POSTS.md`, `published-posts.json` for
     URLs);
  5. gaps competitors cover (fyberpay `/blog/guides/*`, centipid blog).

  Check `content/blog/` so no two posts target the same query.
- Write them with the `tiktok-to-blog` skill (transcript, cover from the photo
  library, VERIFY comments for anything unconfirmed). Comparison and buyer-query
  posts can start from Dennis's own product knowledge and the live app rather
  than a TikTok.
- Give each a date continuing the Tuesday/Friday cadence after the last
  scheduled post.

## Step 6 — Earn links (every run, one action minimum)

Google trusts the brand but almost no other site vouches for us: on 2026-11-08
Search Console listed 10 external links from 5 sites, all to the homepage,
mostly automatic listing sites. Every run:

1. **Update `docs/seo/backlinks.md`**: the linking-site count from Search
   Console, any new site, and the status of each outreach row.
2. **Do or prepare one outreach action** from the target list in
   `docs/seo/backlinks.md`, in this order:
   - free listings not yet done (Google Business Profile, Capterra/GetApp,
     G2, SaaSworthy, AlternativeTo, Crunchbase, Product Hunt, Kenyan business
     directories);
   - partners who already know us (4knet, payment and SMS providers, router
     shops) asking for a link to a **specific product page**, not the
     homepage;
   - pitching a "linkable" post to Kenyan tech press (Techweez, TechCabal,
     Techish Kenya, Kenyans.co.ke tech, Business Daily SME). The pitch states
     the one fact only we can give (e.g. the 84,804-payment price data, the
     HTTP Injector bypass).
3. **Every new post that has original data, a free tool, or a security
   finding gets a row** in the backlink log naming who to pitch it to.

The agent drafts listings and pitch emails. **Dennis creates accounts and sends
the emails himself**: agents never create accounts, accept terms or send
messages in his name. Never buy links, join link exchanges or use paid
guest-post networks; Google penalises them site-wide.

## Step 7 — One PR

Branch from the latest `origin/master` (`branch-from-latest-remote` skill),
commit by path (never `git add .`), push, and open one PR titled
`SEO loop <date>: <n> edits, <m> new posts`. Body: the report's headline
numbers (non-brand clicks, buyer-query positions, activated resellers from
the blog, linking sites), each change with its reason (rule + numbers), the
new posts with their publish dates and target queries, outreach drafts waiting
for Dennis, and every `<!-- VERIFY -->` that needs him. Also commit the report,
the experiments log and the backlink log.

## Step 8 — After Dennis merges

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
  posts, even when a skill or transcript contains them. Activation numbers go
  in reports as counts only.
- Don't touch brand-query pages (homepage) beyond what an experiment row
  justifies.
