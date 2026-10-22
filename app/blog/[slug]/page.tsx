import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { marked } from 'marked';
import {
  extractFaq,
  getAllPosts,
  getAllPostsIncludingScheduled,
  getPost,
  getRelatedPosts,
  unlinkUnpublishedPosts,
} from '../posts';
import { CATEGORY_SOLUTION, categoryStyle } from '../categories';
import { CategoryPill, PostMeta } from '../PostCard';
import ShareRow from './ShareRow';
import './post.css';

// Hourly, so a post scheduled for today (see isLive in posts.ts) appears
// without a deploy.
export const revalidate = 3600;
// Scheduled posts are prerendered too: before their date they render the
// not-found page (noindex; nothing links to them and the sitemap leaves them
// out), and the hourly regeneration turns each into the post on its day.
// Keeping dynamicParams off means unknown slugs stay a real 404 — rendering
// them on demand would answer 200, because the root loading.tsx streams first.
export const dynamicParams = false;

const BASE_URL = 'https://bitwavetechnologies.com';

export function generateStaticParams() {
  return getAllPostsIncludingScheduled().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};
  // The cover doubles as the OG/Twitter card image — most distribution happens
  // as WhatsApp link previews, so every post should have one.
  const images = post.image ? [{ url: post.image, alt: post.imageAlt || post.title }] : undefined;
  return {
    title: `${post.title} | Bitwave Technologies`,
    description: post.description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: 'article',
      url: `/blog/${post.slug}`,
      siteName: 'Bitwave Technologies',
      title: post.title,
      description: post.description,
      publishedTime: post.date,
      ...(post.updated ? { modifiedTime: post.updated } : {}),
      images,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.description,
      images: images?.map((image) => image.url),
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  const livePosts = getAllPosts();
  const html = unlinkUnpublishedPosts(
    (await marked.parse(post.content)).replace(/<img /g, '<img loading="lazy" decoding="async" '),
    new Set(livePosts.map((live) => live.slug)),
  );
  const url = `${BASE_URL}/blog/${post.slug}`;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    ...(post.updated ? { dateModified: post.updated } : {}),
    ...(post.image ? { image: `${BASE_URL}${post.image}` } : {}),
    author: { '@type': 'Organization', name: 'Bitwave Technologies' },
    publisher: { '@type': 'Organization', name: 'Bitwave Technologies' },
    mainEntityOfPage: url,
  };
  const related = getRelatedPosts(post, livePosts);
  const solution = CATEGORY_SOLUTION[post.category] ?? CATEGORY_SOLUTION.business;
  const faq = extractFaq(post.content);
  const faqJsonLd = faq.length
    ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faq.map((entry) => ({
          '@type': 'Question',
          name: entry.question,
          acceptedAnswer: { '@type': 'Answer', text: entry.answer },
        })),
      }
    : null;

  return (
    <article className="max-w-3xl mx-auto px-4 py-10 sm:py-14">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      )}
      <nav className="text-sm text-white/50">
        <Link href="/blog" className="hover:text-white/80 transition-colors">
          Blog
        </Link>
        <span aria-hidden> › </span>
        <Link
          href={`/blog/category/${post.category}`}
          className="hover:text-white/80 transition-colors"
        >
          {categoryStyle(post.category).label}
        </Link>
      </nav>
      {post.image && (
        <Image
          src={post.image}
          alt={post.imageAlt || post.title}
          width={720}
          height={405}
          className="mt-5 aspect-video w-full object-cover rounded-xl border border-white/10"
          sizes="(min-width: 768px) 736px, 100vw"
          priority
        />
      )}
      <div className="mt-5">
        <CategoryPill category={post.category} />
      </div>
      <h1 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight leading-tight">
        {post.title}
      </h1>
      <div className="mt-4">
        <PostMeta post={post} />
      </div>
      <ShareRow title={post.title} url={url} />
      <div className="blog-prose mt-10" dangerouslySetInnerHTML={{ __html: html }} />
      <div className="mt-10">
        <ShareRow title={post.title} url={url} />
      </div>
      <div className="mt-8 border border-amber-500/30 bg-amber-500/5 rounded-xl p-6">
        <p className="font-semibold">Running an internet business in Kenya?</p>
        <p className="mt-1 text-sm text-white/60">
          Bitwave automates billing for 200+ ISP networks: M-Pesa payments, hotspot
          vouchers, PPPoE and MikroTik management in one dashboard.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3">
          <Link
            href="/signup"
            className="inline-block bg-gradient-to-r from-amber-500 to-orange-500 text-[#09090b] font-semibold px-6 py-2.5 rounded-lg hover:shadow-lg hover:shadow-amber-500/30 transition-all"
          >
            Start free
          </Link>
          <Link href={solution.path} className="text-sm text-amber-400 underline underline-offset-4 hover:text-amber-300">
            {solution.cta}
          </Link>
        </div>
      </div>
      {related.length > 0 && (
        <nav aria-label="Keep reading" className="mt-12">
          <h2 className="text-lg font-semibold">Keep reading</h2>
          <ul className="mt-4 divide-y divide-white/10 border-y border-white/10">
            {related.map((item) => (
              <li key={item.slug}>
                <Link href={`/blog/${item.slug}`} className="group flex flex-col gap-1 py-4">
                  <span className="text-xs text-white/50">{categoryStyle(item.category).label}</span>
                  <span className="font-medium group-hover:text-amber-400 transition-colors">{item.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </article>
  );
}
