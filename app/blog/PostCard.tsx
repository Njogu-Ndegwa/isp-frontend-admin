import Link from 'next/link';
import Image from 'next/image';
import type { BlogPost } from './posts';
import { categoryStyle } from './categories';

function CoverImage({ post, eager }: { post: BlogPost; eager?: boolean }) {
  if (!post.image) {
    // Cards must look intentional with no image (cheap pages beat pretty pages).
    return (
      <div className="aspect-video w-full bg-background-tertiary flex items-center justify-center">
        <svg className="w-8 h-8 text-amber-500/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
        </svg>
      </div>
    );
  }
  // Covers are pre-cropped 16:9 WebP ≤720px; next/image adds responsive srcset
  // + AVIF via Vercel's optimizer so phones never download more than they show.
  return (
    <Image
      src={post.image}
      alt={post.imageAlt || post.title}
      width={720}
      height={405}
      className="aspect-video w-full object-cover"
      sizes={eager ? '(min-width: 896px) 832px, 100vw' : '(min-width: 640px) 45vw, 100vw'}
      priority={eager}
    />
  );
}

export function formatDate(date: string) {
  return new Date(date).toLocaleDateString('en-KE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function PostMeta({ post }: { post: BlogPost }) {
  return (
    <div className="flex items-center gap-2 text-xs text-white/40">
      <time dateTime={post.date}>{formatDate(post.date)}</time>
      <span aria-hidden>·</span>
      <span>{post.readMinutes} min read</span>
      {post.updated && (
        <>
          <span aria-hidden>·</span>
          <span className="text-emerald-400/80">Updated {formatDate(post.updated)}</span>
        </>
      )}
    </div>
  );
}

export function CategoryPill({ category }: { category: string }) {
  const style = categoryStyle(category);
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${style.pill}`}>
      {style.label}
    </span>
  );
}

export function FeaturedPostCard({ post }: { post: BlogPost }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="block group rounded-2xl overflow-hidden border border-amber-500/30 bg-gradient-to-br from-amber-500/[0.07] to-orange-500/[0.03] hover:border-amber-500/50 transition-colors"
    >
      <CoverImage post={post} eager />
      <div className="p-5 sm:p-6">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-400">Featured</span>
          <CategoryPill category={post.category} />
        </div>
        <h2 className="mt-2 text-xl sm:text-2xl font-bold leading-snug group-hover:text-amber-400 transition-colors">
          {post.title}
        </h2>
        <p className="mt-2 text-sm text-white/60 leading-relaxed">{post.description}</p>
        <div className="mt-3">
          <PostMeta post={post} />
        </div>
      </div>
    </Link>
  );
}

export function PostCard({ post }: { post: BlogPost }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="block group rounded-xl overflow-hidden border border-white/10 hover:border-white/25 transition-colors"
    >
      <CoverImage post={post} />
      <div className="p-4">
        <CategoryPill category={post.category} />
        <h2 className="mt-2 font-semibold leading-snug group-hover:text-amber-400 transition-colors">
          {post.title}
        </h2>
        <div className="mt-2">
          <PostMeta post={post} />
        </div>
      </div>
    </Link>
  );
}

// Mid-grid conversion card: a real interactive destination (the landing page's
// pricing calculator), not a newsletter form we have no backend for.
export function PricingPromptCard() {
  return (
    <Link
      href="/#pricing"
      className="flex flex-col justify-center rounded-xl border border-amber-500/30 bg-amber-500/5 p-5 hover:border-amber-500/50 transition-colors"
    >
      <p className="font-semibold">What would Bitwave cost for your network?</p>
      <p className="mt-1.5 text-sm text-white/60 leading-relaxed">
        Put your customer numbers into the pricing calculator — takes 30 seconds, in KES.
      </p>
      <span className="mt-3 text-sm font-semibold text-amber-400">Try the calculator →</span>
    </Link>
  );
}
