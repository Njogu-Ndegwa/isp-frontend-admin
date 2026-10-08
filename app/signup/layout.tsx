import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign Up Free — Bitwave ISP Billing',
  description:
    'Create a free Bitwave account and start selling WiFi through M-Pesa. We configure your MikroTik for you, with no setup fee.',
  alternates: { canonical: '/signup' },
};

export default function SignupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
