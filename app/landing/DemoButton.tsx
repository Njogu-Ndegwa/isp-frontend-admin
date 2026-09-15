'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';

type DemoButtonProps = {
  children: ReactNode;
  className?: string;
  onBeforeNavigate?: () => void;
};

export default function DemoButton({ children, className = '', onBeforeNavigate }: DemoButtonProps) {
  return (
    <Link href="/demo" onClick={onBeforeNavigate} className={className}>
      {children}
    </Link>
  );
}
