import type { Metadata } from 'next';
import Link from 'next/link';
import LandingHeader from '../landing/LandingHeader';
import LandingFooter from '../landing/LandingFooter';
import FloatingContact from '../components/FloatingContact';
import { getAllPosts } from '../blog/posts';
import { SOLUTIONS, SOLUTION_LINK_LABELS } from './solutions';
import type { SolutionPath } from './paths';

const BASE_URL = 'https://bitwavetechnologies.com';

export function solutionMetadata(path: SolutionPath): Metadata {
  const solution = SOLUTIONS[path];
  return {
    title: { absolute: solution.metaTitle },
    description: solution.metaDescription,
    alternates: { canonical: path },
    openGraph: {
      type: 'website',
      url: path,
      siteName: 'Bitwave Technologies',
      title: solution.metaTitle,
      description: solution.metaDescription,
    },
    twitter: {
      card: 'summary_large_image',
      title: solution.metaTitle,
      description: solution.metaDescription,
    },
  };
}

function Check() {
  return (
    <svg
      className="w-5 h-5 text-amber-500 shrink-0 mt-px"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

/**
 * A commercial landing page, server-rendered end to end so every word is in
 * the HTML search engines and answer engines read. Copy lives in solutions.ts.
 */
export default function SolutionPage({ path }: { path: SolutionPath }) {
  const solution = SOLUTIONS[path];
  // Live posts only (scheduled ones stay hidden until their date); the route
  // revalidates hourly so new guides show up here as they publish.
  const guides = getAllPosts()
    .filter((post) => solution.guideCategories.includes(post.category))
    .slice(0, 4);

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'Service',
      name: solution.h1,
      serviceType: solution.eyebrow,
      description: solution.metaDescription,
      url: `${BASE_URL}${path}`,
      areaServed: { '@type': 'Country', name: 'Kenya' },
      provider: { '@type': 'Organization', name: 'Bitwave Technologies', url: BASE_URL },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: solution.faqs.map(({ q, a }) => ({
        '@type': 'Question',
        name: q,
        acceptedAnswer: { '@type': 'Answer', text: a },
      })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${BASE_URL}/` },
        { '@type': 'ListItem', position: 2, name: solution.eyebrow, item: `${BASE_URL}${path}` },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <LandingHeader />

      <main className="pt-16">
        <section className="px-4 pt-14 pb-10 md:pt-20">
          <div className="max-w-3xl mx-auto">
            <span className="text-xs font-semibold uppercase tracking-wider text-accent-primary">
              {solution.eyebrow}
            </span>
            <h1 className="text-3xl md:text-5xl font-bold mt-3 leading-tight">{solution.h1}</h1>
            <p className="mt-5 text-foreground-muted text-lg leading-relaxed">{solution.intro}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/signup"
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-background font-semibold shadow-lg shadow-amber-500/20"
              >
                Start free
              </Link>
              <Link
                href="/pricing"
                className="px-6 py-3 rounded-xl border border-border text-foreground font-semibold hover:bg-white/5 transition-colors"
              >
                See pricing
              </Link>
            </div>
          </div>
        </section>

        <section className="px-4 py-10">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold">{solution.steps.heading}</h2>
            <ol className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {solution.steps.items.map((step, index) => (
                <li key={step.title} className="card p-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-accent-primary">
                    Step {index + 1}
                  </p>
                  <h3 className="mt-2 font-semibold text-lg">{step.title}</h3>
                  <p className="mt-1 text-sm text-foreground-muted leading-relaxed">{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {solution.sections.map((section) => (
          <section key={section.heading} className="px-4 py-10">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-bold">{section.heading}</h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph} className="mt-4 text-foreground-muted leading-relaxed">
                  {paragraph}
                </p>
              ))}
              {section.bullets && (
                <ul className="mt-6 space-y-3">
                  {section.bullets.map((bullet) => (
                    <li key={bullet} className="flex gap-3">
                      <Check />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        ))}

        <section className="px-4 py-10">
          <div className="max-w-3xl mx-auto card p-6 md:p-8">
            <h2 className="text-2xl font-bold">{solution.pricing.heading}</h2>
            <p className="mt-3 text-foreground-muted">{solution.pricing.note}</p>
            <table className="mt-6 w-full text-left text-sm">
              <tbody>
                {solution.pricing.rows.map((row) => (
                  <tr key={row.setup} className="border-t border-border">
                    <td className="py-3 pr-4">{row.setup}</td>
                    <td className="py-3 font-semibold text-right">{row.cost}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Link href="/pricing" className="mt-6 inline-block text-accent-primary underline underline-offset-4">
              Work out your own monthly cost
            </Link>
          </div>
        </section>

        <section className="px-4 py-10">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold">Frequently asked questions</h2>
            <div className="mt-6 divide-y divide-border border-y border-border">
              {solution.faqs.map(({ q, a }) => (
                <div key={q} className="py-5">
                  <h3 className="font-semibold">{q}</h3>
                  <p className="mt-2 text-foreground-muted leading-relaxed">{a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {guides.length > 0 && (
          <section className="px-4 py-10">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-2xl font-bold">Guides from the Bitwave blog</h2>
              <ul className="mt-5 space-y-3">
                {guides.map((post) => (
                  <li key={post.slug}>
                    <Link
                      href={`/blog/${post.slug}`}
                      className="text-accent-primary underline underline-offset-4"
                    >
                      {post.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        <section className="px-4 pt-10 pb-20">
          <div className="max-w-3xl mx-auto">
            <div className="border border-amber-500/30 bg-amber-500/5 rounded-xl p-6 md:p-8 text-center">
              <h2 className="text-2xl font-bold">Ready to stop billing by hand?</h2>
              <p className="mt-2 text-foreground-muted">
                Create an account, share your MikroTik, and start selling the same day.
              </p>
              <Link
                href="/signup"
                className="mt-5 inline-block px-8 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-background font-semibold shadow-lg shadow-amber-500/20"
              >
                Create your account
              </Link>
            </div>
            <nav aria-label="Other Bitwave solutions" className="mt-10">
              <p className="text-sm font-semibold text-foreground-muted">Also on Bitwave</p>
              <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
                {solution.related.map((relatedPath) => (
                  <li key={relatedPath}>
                    <Link href={relatedPath} className="text-sm underline underline-offset-4 hover:text-foreground">
                      {SOLUTION_LINK_LABELS[relatedPath]}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </section>
      </main>

      <LandingFooter />
      <FloatingContact />
    </div>
  );
}
