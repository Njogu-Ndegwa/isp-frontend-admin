import type { Metadata } from 'next';
import Link from 'next/link';
import { getAllPosts } from './posts';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'Blog — Bitwave Technologies | ISP & Hotspot Business Guides for Kenya',
  description:
    'Practical guides on running a WiFi hotspot or PPPoE internet business in Kenya: MikroTik setup, M-Pesa billing, growing subscribers and more.',
  alternates: { canonical: '/blog' },
  openGraph: {
    type: 'website',
    url: '/blog',
    siteName: 'Bitwave Technologies',
    title: 'Bitwave Blog — ISP & Hotspot Business Guides for Kenya',
    description:
      'Practical guides on running a WiFi hotspot or PPPoE internet business in Kenya.',
  },
};

export default function BlogIndexPage() {
  const posts = getAllPosts();
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-4 py-16">
        <Link href="/" className="text-sm text-white/50 hover:text-white/80 transition-colors">
          ← Bitwave Technologies
        </Link>
        <h1 className="mt-4 text-4xl font-bold tracking-tight">Blog</h1>
        <p className="mt-3 text-white/60">
          Guides for running and growing an internet business in Kenya — hotspots, PPPoE,
          MikroTik and M-Pesa billing.
        </p>
        <ul className="mt-10 space-y-8">
          {posts.map((post) => (
            <li key={post.slug} className="border border-white/10 rounded-xl p-6 hover:border-white/25 transition-colors">
              <Link href={`/blog/${post.slug}`} className="block group">
                <h2 className="text-xl font-semibold group-hover:text-amber-400 transition-colors">
                  {post.title}
                </h2>
                <p className="mt-2 text-sm text-white/60 leading-relaxed">{post.description}</p>
                <time dateTime={post.date} className="mt-3 block text-xs text-white/40">
                  {new Date(post.date).toLocaleDateString('en-KE', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </time>
              </Link>
            </li>
          ))}
        </ul>
        {posts.length === 0 && <p className="mt-10 text-white/50">Posts coming soon.</p>}
      </div>
    </div>
  );
}
