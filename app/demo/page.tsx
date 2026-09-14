import type { Metadata } from 'next';
import DemoEntry from './DemoEntry';

export const metadata: Metadata = {
  title: 'Live ISP Billing Demo | Bitwave Technologies',
  description: 'Explore the Bitwave ISP billing dashboard with safe sample data.',
  robots: { index: false, follow: false },
};

export default function DemoPage() {
  return <DemoEntry />;
}
