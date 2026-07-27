import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getAllPosts } from '../../posts';
import { categoryStyle } from '../../categories';
import CategoryChips from '../../CategoryChips';
import { PostCard } from '../../PostCard';

export const dynamic = 'force-static';
export const dynamicParams = false;

export function generateStaticParams() {
  const categories = Array.from(new Set(getAllPosts().map((post) => post.category)));
  return categories.map((category) => ({ category }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category } = await params;
  const label = categoryStyle(category).label;
  return {
    title: `${label} Guides — Bitwave Blog | ISP Billing in Kenya`,
    description: `${label} guides for WiFi hotspot and PPPoE internet businesses in Kenya, from the team behind Bitwave.`,
    alternates: { canonical: `/blog/category/${category}` },
  };
}

export default async function BlogCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const allPosts = getAllPosts();
  const posts = allPosts.filter((post) => post.category === category);
  if (posts.length === 0) notFound();
  const label = categoryStyle(category).label;

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 sm:py-16">
      <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">{label} guides</h1>
      <p className="mt-3 text-white/60 max-w-2xl">
        Everything on the blog about {label.toLowerCase()}, for internet businesses in Kenya.
      </p>
      <CategoryChips posts={allPosts} active={category} />
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-5">
        {posts.map((post) => (
          <PostCard key={post.slug} post={post} />
        ))}
      </div>
    </div>
  );
}
