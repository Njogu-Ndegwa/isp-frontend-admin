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

export function getAllPosts(): BlogPost[] {
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
