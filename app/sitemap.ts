import type { MetadataRoute } from 'next';
import { getAllPosts } from './blog/posts';

const BASE_URL = 'https://bitwavetechnologies.com';

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
    { url: `${BASE_URL}/signup`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE_URL}/blog`, changeFrequency: 'daily', priority: 0.7 },
    ...categories,
    ...posts,
  ];
}
