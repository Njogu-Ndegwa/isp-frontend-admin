import type { Metadata } from 'next';
import { getAllPosts } from './posts';
import CategoryChips from './CategoryChips';
import { FeaturedPostCard, PostCard, PricingPromptCard } from './PostCard';

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
  const [featured, ...rest] = posts;

  // Slot the pricing-calculator card into the grid after the first pair of
  // posts (inline conversion placements outperform end-of-page ones).
  const gridItems: React.ReactNode[] = rest.map((post) => (
    <PostCard key={post.slug} post={post} />
  ));
  gridItems.splice(Math.min(2, gridItems.length), 0, <PricingPromptCard key="pricing-prompt" />);

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 sm:py-16">
      <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">The Bitwave Blog</h1>
      <p className="mt-3 text-white/60 max-w-2xl">
        Guides for running and growing an internet business in Kenya — hotspots, PPPoE,
        MikroTik and M-Pesa billing.
      </p>
      <CategoryChips posts={posts} />
      {featured && (
        <div className="mt-8">
          <FeaturedPostCard post={featured} />
        </div>
      )}
      {gridItems.length > 0 && (
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-5">{gridItems}</div>
      )}
      {posts.length === 0 && <p className="mt-10 text-white/50">Posts coming soon.</p>}
    </div>
  );
}
