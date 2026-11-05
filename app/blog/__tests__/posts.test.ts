import { describe, expect, it } from 'vitest';
import { getRelatedPosts, isLive, todayInKenya, unlinkUnpublishedPosts, type BlogPost } from '../posts';
import { CATEGORY_SOLUTION, CATEGORIES } from '../categories';
import { SOLUTIONS } from '../../solutions/solutions';
import { SOLUTION_PATHS } from '../../solutions/paths';

function post(slug: string, category: string, date = '2026-10-01'): BlogPost {
  return {
    slug,
    title: slug,
    description: '',
    date,
    tags: [],
    category,
    readMinutes: 1,
    content: '',
  };
}

describe('todayInKenya', () => {
  it('rolls over at midnight in Nairobi, not at midnight UTC', () => {
    // 21:30 UTC on the 22nd is 00:30 on the 23rd in Kenya (UTC+3).
    expect(todayInKenya(new Date('2026-10-22T21:30:00Z'))).toBe('2026-10-23');
    expect(todayInKenya(new Date('2026-10-22T20:59:00Z'))).toBe('2026-10-22');
  });
});

describe('isLive', () => {
  it('publishes a post on its date and hides it before', () => {
    expect(isLive({ date: '2026-10-23' }, '2026-10-22')).toBe(false);
    expect(isLive({ date: '2026-10-23' }, '2026-10-23')).toBe(true);
    expect(isLive({ date: '2026-07-15' }, '2026-10-23')).toBe(true);
  });
});

describe('getRelatedPosts', () => {
  const posts = [
    post('a', 'hotspot', '2026-10-05'),
    post('b', 'pppoe', '2026-10-04'),
    post('c', 'hotspot', '2026-10-03'),
    post('d', 'mikrotik', '2026-10-02'),
    post('e', 'hotspot', '2026-10-01'),
  ];

  it('prefers the same category, never returns the post itself', () => {
    const related = getRelatedPosts(posts[0], posts).map((p) => p.slug);
    expect(related).toEqual(['c', 'e', 'b']);
  });

  it('fills from other categories when the category is thin', () => {
    const related = getRelatedPosts(posts[1], posts).map((p) => p.slug);
    expect(related).toEqual(['a', 'c', 'd']);
  });
});

describe('unlinkUnpublishedPosts', () => {
  it('keeps links to live posts and flattens links to scheduled ones', () => {
    const html =
      '<p>See <a href="/blog/live-one">the live guide</a>, <a href="/blog/later#faq">a later one</a>, ' +
      '<a href="/blog/category/hotspot">the hub</a> and <a href="/signup">sign up</a>.</p>';
    expect(unlinkUnpublishedPosts(html, new Set(['live-one']))).toBe(
      '<p>See <a href="/blog/live-one">the live guide</a>, a later one, ' +
        '<a href="/blog/category/hotspot">the hub</a> and <a href="/signup">sign up</a>.</p>',
    );
  });
});

describe('solution pages', () => {
  it('has copy for every path and a solution for every blog category', () => {
    for (const path of SOLUTION_PATHS) {
      expect(SOLUTIONS[path].path).toBe(path);
      expect(SOLUTIONS[path].metaDescription.length).toBeLessThanOrEqual(160);
      for (const related of SOLUTIONS[path].related) expect(SOLUTION_PATHS).toContain(related);
    }
    for (const category of Object.keys(CATEGORIES)) {
      expect(CATEGORY_SOLUTION[category]).toBeDefined();
    }
  });
});
