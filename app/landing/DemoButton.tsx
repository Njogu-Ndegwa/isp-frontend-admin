'use client';

import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';

type DemoButtonProps = {
  children: ReactNode;
  className?: string;
  onBeforeNavigate?: () => void;
};

export default function DemoButton({ children, className = '', onBeforeNavigate }: DemoButtonProps) {
  const router = useRouter();
  const { loginAsDemo } = useAuth();

  const handleClick = () => {
    onBeforeNavigate?.();
    loginAsDemo();
    router.push('/dashboard');
  };

  return (
    <button type="button" onClick={handleClick} className={className}>
      {children}
    </button>
  );
}
