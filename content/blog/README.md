# Blog content

Each post is one markdown file in this directory. The filename (minus `.md`)
is the URL slug: `content/blog/my-post.md` → `bitwavetechnologies.com/blog/my-post`.

Required frontmatter:

```markdown
---
title: Post title (also the <title> and H1)
description: 1–2 sentence summary used for meta description and previews
date: YYYY-MM-DD
tags: comma, separated, tags
published: true
---
```

Set `published: false` to keep a draft out of the live site, sitemap and index.

Posts are statically generated at build time — merging a new `.md` file to the
production branch publishes it on the next deploy. This is the review gate for
the TikTok→blog pipeline: generated drafts land here as a PR, Dennis verifies
or rectifies the content, and merging publishes.
