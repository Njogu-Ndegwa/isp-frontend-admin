'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../context/AlertContext';
import Link from 'next/link';
import { api } from '../lib/api';
import type { RegisterRequest } from '../lib/types';

export default function SignupPage() {
  const router = useRouter();
  const { isAuthenticated, isDemo, logout, login } = useAuth();
  const { showAlert } = useAlert();
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    organization_name: '',
    business_name: '',
    support_phone: '',
  });

  if (isAuthenticated && isDemo) {
    logout();
  } else if (isAuthenticated) {
    router.push('/dashboard');
    return null;
  }

  const update = (field: string, value: string) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!registered && formData.password !== confirmPassword) {
      showAlert('error', 'Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      if (!registered) {
        const payload: RegisterRequest = {
          ...formData,
          role: 'reseller',
          support_phone: formData.support_phone || undefined,
        };
        await api.register(payload);
        setRegistered(true);
      }

      showAlert('success', 'Account created! Signing you in...');

      const subscriptionAlert = await login({
        email: formData.email,
        password: formData.password,
      });

      if (subscriptionAlert) {
        const status = subscriptionAlert.status;
        if (status === 'suspended' || status === 'inactive') {
          showAlert('warning', subscriptionAlert.message);
          router.push('/settings/subscription');
          return;
        }
        if (subscriptionAlert.message) {
          showAlert('info', subscriptionAlert.message);
        }
      }

      router.push('/setup');
    } catch (err) {
      if (registered) {
        showAlert('warning', 'Account created! Please sign in to continue.');
        router.push(`/login?email=${encodeURIComponent(formData.email)}`);
      } else {
        const message =
          err instanceof Error ? err.message : 'Registration failed. Please try again.';
        showAlert('error', message);
      }
    } finally {
      setLoading(false);
    }
  };

  const PasswordToggle = ({ visible, onToggle }: { visible: boolean; onToggle: () => void }) => (
    <button
      type="button"
      onClick={onToggle}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-muted/60 hover:text-foreground-muted transition-colors p-0.5"
      tabIndex={-1}
    >
      {visible ? (
        <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
        </svg>
      ) : (
        <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )}
    </button>
  );

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 relative">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-amber-500/[0.07] rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-orange-500/[0.05] rounded-full blur-[100px]" />
      </div>

      <div className="relative w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block group">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20 group-hover:shadow-amber-500/40 transition-shadow">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
              </svg>
            </div>
          </Link>
          <h1 className="text-2xl font-bold mt-5 text-foreground">Create your <span className="gradient-text">Bitwave</span> account</h1>
          <p className="text-sm text-foreground-muted mt-1.5">Reseller Registration</p>
        </div>

        <div className="card p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-foreground-muted mb-1.5">Email</label>
              <input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => update('email', e.target.value)}
                className="input"
                placeholder="you@example.com"
                required
                autoComplete="off"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-foreground-muted mb-1.5">Password</label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => update('password', e.target.value)}
                    className="input"
                    style={{ paddingRight: '2.75rem' }}
                    placeholder="Password"
                    required
                    minLength={6}
                    autoComplete="new-password"
                    data-lpignore="true"
                    data-1p-ignore
                  />
                  <PasswordToggle visible={showPassword} onToggle={() => setShowPassword(!showPassword)} />
                </div>
              </div>

              <div>
                <label htmlFor="confirm-password" className="block text-sm font-medium text-foreground-muted mb-1.5">Confirm Password</label>
                <div className="relative">
                  <input
                    id="confirm-password"
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="input"
                    style={{ paddingRight: '2.75rem' }}
                    placeholder="Confirm"
                    required
                    minLength={6}
                    autoComplete="new-password"
                    data-lpignore="true"
                    data-1p-ignore
                  />
                  <PasswordToggle visible={showConfirm} onToggle={() => setShowConfirm(!showConfirm)} />
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="organization_name" className="block text-sm font-medium text-foreground-muted mb-1.5">Organization Name</label>
              <input
                id="organization_name"
                type="text"
                value={formData.organization_name}
                onChange={(e) => update('organization_name', e.target.value)}
                className="input"
                placeholder="e.g. My ISP"
                required
              />
            </div>

            <div>
              <label htmlFor="business_name" className="block text-sm font-medium text-foreground-muted mb-1.5">Business Name</label>
              <input
                id="business_name"
                type="text"
                value={formData.business_name}
                onChange={(e) => update('business_name', e.target.value)}
                className="input"
                placeholder="e.g. Acme Internet Services"
                required
              />
            </div>

            <div>
              <label htmlFor="support_phone" className="block text-sm font-medium text-foreground-muted mb-1.5">Phone Number <span className="text-foreground-muted/50 font-normal">(optional)</span></label>
              <input
                id="support_phone"
                type="tel"
                value={formData.support_phone}
                onChange={(e) => update('support_phone', e.target.value)}
                className="input"
                placeholder="e.g. 0712345678"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3 text-base font-semibold flex items-center justify-center gap-2 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" />
                  Setting up your account...
                </>
              ) : (
                'Create Account'
              )}
            </button>
          </form>
        </div>

        <div className="mt-6 text-center space-y-3">
          <p className="text-sm text-foreground-muted">
            Already have an account?{' '}
            <Link href="/login" className="text-amber-500 hover:text-amber-400 font-medium transition-colors">
              Sign In
            </Link>
          </p>
          <Link href="/" className="text-sm text-foreground-muted hover:text-foreground transition-colors inline-flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Home
          </Link>
          <p className="text-xs text-foreground-muted/40">Powered by Bitwave Technologies</p>
        </div>
      </div>
    </div>
  );
}
