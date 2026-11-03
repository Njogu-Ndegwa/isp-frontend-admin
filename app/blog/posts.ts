import fs from 'fs';
import path from 'path';

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string;
  /** Optional `updated:` frontmatter — shown as a freshness signal when present. */
  updated?: string;
  tags: string[];
  /** Topic key driving the card color + category page (see categories.ts). */
  category: string;
  /** Root-absolute cover image path (e.g. /blog-images/<slug>/cover.webp). */
  image?: string;
  imageAlt?: string;
  readMinutes: number;
  content: string;
}

const CONTENT_DIR = path.join(process.cwd(), 'content', 'blog');

/**
 * Today's date in Kenya (UTC+3, no DST) as YYYY-MM-DD — the clock a post's
 * `date:` is written against.
 */
export function todayInKenya(now: Date = new Date()): string {
  return new Date(now.getTime() + 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/**
 * Scheduled publishing: a post whose `date:` is in the future stays hidden
 * everywhere (index, category pages, sitemap, llms.txt, its own URL) until that
 * day in Kenya. A batch of reviewed posts can be merged at once and still go out
 * one or two a week; the blog pages revalidate hourly to pick each one up.
 */
export function isLive(post: Pick<BlogPost, 'date'>, today: string = todayInKenya()): boolean {
  return post.date <= today;
}

// Minimal frontmatter parser: a leading `---` block of `key: value` lines.
// Kept dependency-free so the TikTok->blog pipeline only has to emit plain
// markdown files into content/blog/.
function parseFrontmatter(raw: string): { meta: Record<string, string>; body: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return { meta: {}, body: raw };
  const meta: Record<string, string> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    meta[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  }
  return { meta, body: raw.slice(match[0].length) };
}

/** Every post marked published, including ones scheduled for a future date. */
export function getAllPostsIncludingScheduled(): BlogPost[] {
  if (!fs.existsSync(CONTENT_DIR)) return [];
  return fs
    .readdirSync(CONTENT_DIR)
    .filter((file) => file.endsWith('.md'))
    .flatMap((file): BlogPost[] => {
      const raw = fs.readFileSync(path.join(CONTENT_DIR, file), 'utf8');
      const { meta, body } = parseFrontmatter(raw);
      // Files without frontmatter (e.g. README.md) are not posts.
      if (!meta.title || meta.published === 'false') return [];
      const tags = meta.tags ? meta.tags.split(',').map((t) => t.trim()) : [];
      const words = body.split(/\s+/).filter(Boolean).length;
      return [
        {
          slug: file.replace(/\.md$/, ''),
          title: meta.title,
          description: meta.description || '',
          date: meta.date || '1970-01-01',
          updated: meta.updated || undefined,
          tags,
          category: (meta.category || tags[0] || 'guide').toLowerCase(),
          image: meta.image || undefined,
          imageAlt: meta.imageAlt || undefined,
          readMinutes: Math.max(1, Math.round(words / 200)),
          content: body,
        },
      ];
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

/** Posts that are live today, newest first. */
export function getAllPosts(today: string = todayInKenya()): BlogPost[] {
  return getAllPostsIncludingScheduled().filter((post) => isLive(post, today));
}

/**
 * Further reading for the end of a post: same category first (newest first),
 * then the newest posts from other categories. Every article links onward, so
 * no post is a dead end for readers or for crawlers.
 */
export function getRelatedPosts(post: BlogPost, posts: BlogPost[], limit = 3): BlogPost[] {
  const others = posts.filter((candidate) => candidate.slug !== post.slug);
  const sameCategory = others.filter((candidate) => candidate.category === post.category);
  const rest = others.filter((candidate) => candidate.category !== post.category);
  return [...sameCategory, ...rest].slice(0, limit);
}

/**
 * Posts in a scheduled batch link to each other, and a link to a sibling that
 * isn't live yet would 404. Render those links as plain text until the target
 * publishes; the page revalidates hourly, so the link appears once it's live.
 */
export function unlinkUnpublishedPosts(html: string, liveSlugs: Set<string>): string {
  return html.replace(
    /<a href="\/blog\/([a-z0-9-]+)(?:#[^"]*)?"[^>]*>([\s\S]*?)<\/a>/g,
    (link, slug: string, text: string) => (liveSlugs.has(slug) ? link : text),
  );
}

export function getPost(slug: string): BlogPost | undefined {
  return getAllPosts().find((post) => post.slug === slug);
}

export interface FaqEntry {
  question: string;
  answer: string;
}

// Pull Q&A pairs out of a post's `## FAQ` section (bold question line followed
// by answer paragraphs) so pages can emit FAQPage JSON-LD — the format AI
// Overviews and answer engines quote from.
export function extractFaq(content: string): FaqEntry[] {
  const start = content.search(/^## FAQ[ \t]*\r?$/m);
  if (start === -1) return [];
  const after = content.slice(start).replace(/^## FAQ[^\n]*\n/, '');
  const nextHeading = after.search(/^## /m);
  const body = (nextHeading === -1 ? after : after.slice(0, nextHeading)).replace(
    /<!--[\s\S]*?-->/g,
    '',
  );
  const entries: FaqEntry[] = [];
  const pair = /\*\*(.+?)\*\*\s*\r?\n+([\s\S]*?)(?=\r?\n\s*\*\*|$)/g;
  let match;
  while ((match = pair.exec(body)) !== null) {
    const answer = match[2].replace(/\s+/g, ' ').trim();
    if (answer) entries.push({ question: match[1].trim(), answer });
  }
  return entries;
}
