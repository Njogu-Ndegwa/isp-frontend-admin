import type { Metadata, Viewport } from 'next';
import AssistantIsland from './AssistantIsland';

// Bitwave AI is an app of its own: added to a phone's home screen it opens straight
// into the chat, full screen, with no browser bar and no dashboard around it.
export const metadata: Metadata = {
  title: 'Bitwave AI',
  description: 'Run your hotspot and PPPoE business by chat: money, customers and every MikroTik, live.',
  manifest: '/assistant.webmanifest',
  appleWebApp: { capable: true, title: 'Bitwave AI', statusBarStyle: 'black-translucent' },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#08090b' },
    { media: '(prefers-color-scheme: light)', color: '#f6f6f4' },
  ],
};

export default function AssistantPage() {
  return <AssistantIsland />;
}
