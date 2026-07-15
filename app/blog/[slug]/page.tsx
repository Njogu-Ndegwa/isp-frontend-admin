import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { marked } from 'marked';
import { getAllPosts, getPost } from '../posts';
import './post.css';

export const dynamic = 'force-static';
export const dynamicParams = false;

export function generateStaticParams() {
  return getAllPosts().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};
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
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.description,
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

  const html = await marked.parse(post.content);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    author: { '@type': 'Organization', name: 'Bitwave Technologies' },
    publisher: { '@type': 'Organization', name: 'Bitwave Technologies' },
    mainEntityOfPage: `https://bitwavetechnologies.com/blog/${post.slug}`,
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <article className="max-w-3xl mx-auto px-4 py-16">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <Link href="/blog" className="text-sm text-white/50 hover:text-white/80 transition-colors">
          ← All posts
        </Link>
        <h1 className="mt-4 text-3xl sm:text-4xl font-bold tracking-tight leading-tight">
          {post.title}
        </h1>
        <time dateTime={post.date} className="mt-4 block text-sm text-white/40">
          {new Date(post.date).toLocaleDateString('en-KE', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </time>
        <div className="blog-prose mt-10" dangerouslySetInnerHTML={{ __html: html }} />
        <div className="mt-14 border border-amber-500/30 bg-amber-500/5 rounded-xl p-6">
          <p className="font-semibold">Running an internet business in Kenya?</p>
          <p className="mt-1 text-sm text-white/60">
            Bitwave automates your billing: M-Pesa payments, hotspot vouchers, PPPoE and
            MikroTik management in one dashboard.
          </p>
          <Link
            href="/signup"
            className="mt-4 inline-block bg-gradient-to-r from-amber-500 to-orange-500 text-[#09090b] font-semibold px-6 py-2.5 rounded-lg hover:shadow-lg hover:shadow-amber-500/30 transition-all"
          >
            Start free
          </Link>
        </div>
      </article>
    </div>
  );
}
