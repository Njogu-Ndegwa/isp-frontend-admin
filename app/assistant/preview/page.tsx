import { notFound } from 'next/navigation';
import PreviewClient from './PreviewClient';

/*
 * A design preview of Bitwave AI with made-up figures: the home screen and an answer
 * that uses every block, in both themes. For development only; it does not exist in
 * a production build, and it never calls the API.
 */
export const metadata = { title: 'Bitwave AI preview', robots: { index: false, follow: false } };

export default function AssistantPreviewPage() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <PreviewClient />;
}
