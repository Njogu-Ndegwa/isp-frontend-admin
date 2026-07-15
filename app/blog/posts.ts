import fs from 'fs';
import path from 'path';

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string;
  tags: string[];
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
      return [
        {
          slug: file.replace(/\.md$/, ''),
          title: meta.title,
          description: meta.description || '',
          date: meta.date || '1970-01-01',
          tags: meta.tags ? meta.tags.split(',').map((t) => t.trim()) : [],
          content: body,
        },
      ];
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getPost(slug: string): BlogPost | undefined {
  return getAllPosts().find((post) => post.slug === slug);
}
