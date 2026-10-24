import type { MetadataRoute } from 'next';
import { getAllPosts } from './blog/posts';
import { SOLUTION_PATHS } from './solutions/paths';

const BASE_URL = 'https://bitwavetechnologies.com';

// Hourly, so scheduled posts join the sitemap on their publish date.
export const revalidate = 3600;

export default function sitemap(): MetadataRoute.Sitemap {
  const allPosts = getAllPosts();
  const posts: MetadataRoute.Sitemap = allPosts.map((post) => ({
    url: `${BASE_URL}/blog/${post.slug}`,
    lastModified: new Date(post.updated || post.date),
    changeFrequency: 'monthly',
    priority: 0.6,
  }));
  const categories: MetadataRoute.Sitemap = Array.from(
    new Set(allPosts.map((post) => post.category)),
  ).map((category) => ({
    url: `${BASE_URL}/blog/category/${category}`,
    changeFrequency: 'weekly',
    priority: 0.5,
  }));

  return [
    { url: `${BASE_URL}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${BASE_URL}/pricing`, changeFrequency: 'monthly', priority: 0.9 },
    ...SOLUTION_PATHS.map((path) => ({
      url: `${BASE_URL}${path}`,
      changeFrequency: 'monthly' as const,
      priority: 0.9,
    })),
    { url: `${BASE_URL}/signup`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE_URL}/blog`, changeFrequency: 'daily', priority: 0.7 },
    { url: `${BASE_URL}/store`, changeFrequency: 'weekly', priority: 0.5 },
    ...categories,
    ...posts,
  ];
}
