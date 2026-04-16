'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../context/AlertContext';
import { fullOnboardingCheck } from '../hooks/useOnboardingStatus';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const { login, loginAsDemo, isAuthenticated, isDemo, logout } = useAuth();
  const { showAlert } = useAlert();
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleTryDemo = () => {
    loginAsDemo();
    showAlert('success', 'Welcome to the demo! Explore with sample data.');
    router.push('/dashboard');
  };

  if (isAuthenticated && isDemo) {
    logout();
  } else if (isAuthenticated) {
    router.push('/dashboard');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const subscriptionAlert = await login(credentials);
      showAlert('success', 'Signed in successfully!');

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

      const onboardingResult = await fullOnboardingCheck();
      if (!onboardingResult.isComplete) {
        const wasSkipped = localStorage.getItem('onboarding_dismissed') === 'true';
        if (!wasSkipped) {
          router.push('/setup');
          return;
        }
      } else {
        localStorage.setItem('onboarding_dismissed', 'true');
      }

      router.push('/dashboard');
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Invalid email or password. Please try again.';
      showAlert('error', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 relative">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-amber-500/[0.07] rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-orange-500/[0.05] rounded-full blur-[100px]" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo & Branding */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block group">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20 group-hover:shadow-amber-500/40 transition-shadow">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
              </svg>
            </div>
          </Link>
          <h1 className="text-2xl font-bold mt-5 text-foreground">Sign in to <span className="gradient-text">Bitwave</span></h1>
          <p className="text-sm text-foreground-muted mt-1.5">ISP Billing & Network Management</p>
        </div>

        {/* Login Card */}
        <div className="card p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-foreground-muted mb-1.5">Email</label>
              <input
                id="email"
                type="email"
                value={credentials.email}
                onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
                className="input"
                placeholder="Enter your email"
                required
                autoComplete="off"
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-foreground-muted mb-1.5">Password</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={credentials.password}
                  onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                  className="input pr-10"
                  placeholder="Enter your password"
                  required
                  autoComplete="new-password"
                  data-lpignore="true"
                  data-1p-ignore
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-muted/60 hover:text-foreground-muted transition-colors p-0.5"
                  tabIndex={-1}
                >
                  {showPassword ? (
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
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3 text-base font-semibold flex items-center justify-center gap-2 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
            <div className="relative flex justify-center"><span className="bg-background-secondary px-3 text-xs text-foreground-muted uppercase tracking-wide">or</span></div>
          </div>

          <button
            onClick={handleTryDemo}
            className="w-full py-3 text-sm font-medium rounded-xl border border-amber-500/30 text-amber-500 hover:bg-amber-500/10 hover:border-amber-500/50 transition-all flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            Try Demo Account
          </button>
        </div>

        {/* Footer links */}
        <div className="mt-6 text-center space-y-3">
          <p className="text-sm text-foreground-muted">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="text-amber-500 hover:text-amber-400 font-medium transition-colors">
              Sign Up
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
