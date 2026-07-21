# Blog content

Each post is one markdown file in this directory. The filename (minus `.md`)
is the URL slug: `content/blog/my-post.md` → `bitwavetechnologies.com/blog/my-post`.

Required frontmatter:

```markdown
---
title: Post title (also the <title> and H1)
description: 1–2 sentence summary used for meta description and previews
date: YYYY-MM-DD
updated: YYYY-MM-DD (optional — shown as a freshness badge and used as dateModified)
tags: comma, separated, tags
category: hotspot | mikrotik | mpesa | pppoe | business | comparison
image: /blog-images/<slug>/cover.webp
imageAlt: what the cover shows (used as alt text and OG image alt)
published: true
---
```

Set `published: false` to keep a draft out of the live site, sitemap and index.

`category` drives the card color and the `/blog/category/<key>` hub page
(see `app/blog/categories.ts`; falls back to the first tag). `image` is the
16:9 cover shown on cards, the article header, and WhatsApp/OG link previews —
generate it with `.claude/skills/tiktok-to-blog/make_cover.py` (see the skill's
Step 3 for sourcing rules). Read time is computed automatically.

Posts are statically generated at build time — merging a new `.md` file to the
production branch publishes it on the next deploy. This is the review gate for
the TikTok→blog pipeline: generated drafts land here as a PR, Dennis verifies
or rectifies the content, and merging publishes.
