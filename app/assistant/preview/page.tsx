import { notFound } from 'next/navigation';
import PreviewClient from './PreviewClient';

/*
 * A design preview of Bitwave AI with made-up figures: the home screen and an answer
 * that uses every block, in both themes. It exists in development and on Vercel preview
 * deployments only, never in production, and it never calls the API.
 */
export const metadata = { title: 'Bitwave AI preview', robots: { index: false, follow: false } };

export default function AssistantPreviewPage() {
  // development, and Vercel's preview deployments (so a PR can be looked at in a browser)
  if (process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_VERCEL_ENV !== 'preview') notFound();
  return <PreviewClient />;
}
