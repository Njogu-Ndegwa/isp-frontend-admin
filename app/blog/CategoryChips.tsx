import Link from 'next/link';
import type { BlogPost } from './posts';
import { categoryStyle } from './categories';

// Horizontally scrollable filter chips (360px-friendly). Each chip is a real
// static route (/blog/category/<key>) so the filters double as SEO hub pages.
export default function CategoryChips({
  posts,
  active,
}: {
  posts: BlogPost[];
  active?: string;
}) {
  const categories = Array.from(new Set(posts.map((post) => post.category)));
  const base = 'shrink-0 rounded-full px-3.5 py-1 text-xs font-semibold border transition-colors';
  return (
    <div className="mt-5 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <Link
        href="/blog"
        className={`${base} ${
          !active
            ? 'bg-amber-500 border-amber-500 text-[#09090b]'
            : 'border-white/15 text-white/60 hover:text-white hover:border-white/30'
        }`}
      >
        All
      </Link>
      {categories.map((category) => (
        <Link
          key={category}
          href={`/blog/category/${category}`}
          className={`${base} ${
            active === category
              ? 'bg-amber-500 border-amber-500 text-[#09090b]'
              : 'border-white/15 text-white/60 hover:text-white hover:border-white/30'
          }`}
        >
          {categoryStyle(category).label}
        </Link>
      ))}
    </div>
  );
}
