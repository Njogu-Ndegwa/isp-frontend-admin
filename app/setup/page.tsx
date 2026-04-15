'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../context/AlertContext';
import { api } from '../lib/api';
import { fullOnboardingCheck } from '../hooks/useOnboardingStatus';
import type {
  VpnType,
  ProvisionTokenResponse,
  ProvisionToken,
  CreatePlanRequest,
  CreatePaymentMethodRequest,
  PaymentMethodType,
} from '../lib/types';

const STEPS = [
  { id: 'router', title: 'Add Your First Router', icon: RouterIcon },
  { id: 'plan', title: 'Create Your First Plan', icon: PlanIcon },
  { id: 'payment', title: 'Set Up Payments', icon: PaymentIcon },
  { id: 'profile', title: 'Complete Your Profile', icon: ProfileIcon },
] as const;

export default function SetupPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const [showCelebration, setShowCelebration] = useState(false);
  const [resuming, setResuming] = useState(true);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (!isAuthenticated || isLoading) return;
    let cancelled = false;
    (async () => {
      try {
        const result = await fullOnboardingCheck();
        if (cancelled) return;
        if (result.isComplete) {
          localStorage.setItem('onboarding_dismissed', 'true');
          router.replace('/dashboard');
          return;
        }
        const stepMap: Record<string, boolean> = {};
        if (result.hasRouters) stepMap['router'] = true;
        if (result.hasPlans) stepMap['plan'] = true;
        if (result.hasPaymentMethods) stepMap['payment'] = true;
        if (result.hasProfile) stepMap['profile'] = true;
        setCompleted(stepMap);
        setCurrentStep(result.firstIncompleteStep);
      } catch { /* proceed with defaults */ }
      if (!cancelled) setResuming(false);
    })();
    return () => { cancelled = true; };
  }, [isAuthenticated, isLoading, router]);

  const markComplete = (stepId: string) => {
    setCompleted(prev => ({ ...prev, [stepId]: true }));
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setShowCelebration(true);
    }
  };

  const handleSkipStep = () => {
    handleNext();
  };

  const handleSkipAll = () => {
    localStorage.setItem('onboarding_dismissed', 'true');
    router.push('/dashboard');
  };

  const handleFinish = () => {
    const allDone = Object.keys(completed).length === STEPS.length;
    if (allDone) {
      localStorage.setItem('onboarding_completed', 'true');
    }
    localStorage.setItem('onboarding_dismissed', 'true');
    router.push('/dashboard');
  };

  if (isLoading || !isAuthenticated || resuming) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-3 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (showCelebration) {
    return <CelebrationScreen completed={completed} onFinish={handleFinish} />;
  }

  const step = STEPS[currentStep];
  const StepIcon = step.icon;

  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-amber-500/[0.05] rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-orange-500/[0.04] rounded-full blur-[100px]" />
      </div>

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between px-4 sm:px-6 pt-4 sm:pt-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-foreground hidden sm:block">Bitwave Setup</span>
        </div>
        <button
          onClick={handleSkipAll}
          className="text-xs text-foreground-muted hover:text-foreground transition-colors"
        >
          Skip setup for now
        </button>
      </div>

      {/* Progress */}
      <div className="relative z-10 px-4 sm:px-6 pt-6 pb-2">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-1 mb-2">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex-1 flex items-center gap-1">
                <div className={`h-1.5 rounded-full flex-1 transition-all duration-500 ${
                  i < currentStep || completed[s.id]
                    ? 'bg-amber-500'
                    : i === currentStep
                    ? 'bg-amber-500/50'
                    : 'bg-foreground-muted/15'
                }`} />
              </div>
            ))}
          </div>
          <p className="text-xs text-foreground-muted text-center">
            Step {currentStep + 1} of {STEPS.length}
          </p>
        </div>
      </div>

      {/* Step Content */}
      <div className="flex-1 flex flex-col px-4 sm:px-6 pb-6 relative z-10">
        <div className="max-w-lg mx-auto w-full flex-1 flex flex-col">
          {/* Step Header */}
          <div className="text-center py-4 sm:py-6">
            <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-amber-500/10 flex items-center justify-center">
              <StepIcon className="w-7 h-7 text-amber-500" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">{step.title}</h1>
            <p className="text-sm text-foreground-muted mt-1">
              {stepDescriptions[step.id]}
            </p>
          </div>

          {/* Step Form */}
          <div className="flex-1">
            {step.id === 'router' && (
              <RouterStep
                onComplete={() => { markComplete('router'); handleNext(); }}
              />
            )}
            {step.id === 'plan' && (
              <PlanStep
                onComplete={() => { markComplete('plan'); handleNext(); }}
              />
            )}
            {step.id === 'payment' && (
              <PaymentStep
                onComplete={() => { markComplete('payment'); handleNext(); }}
              />
            )}
            {step.id === 'profile' && (
              <ProfileStep
                userName={user?.organization_name || ''}
                onComplete={() => { markComplete('profile'); handleNext(); }}
              />
            )}
          </div>

          {/* Skip this step */}
          <div className="py-4 text-center" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))' }}>
            <button
              onClick={handleSkipStep}
              className="text-sm text-foreground-muted hover:text-foreground transition-colors active:opacity-70"
              style={{ touchAction: 'manipulation' }}
            >
              I&apos;ll do this later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const stepDescriptions: Record<string, string> = {
  router: 'Your router is the foundation of your network. Generate a token and paste the command into your MikroTik terminal.',
  plan: 'Create an internet plan that your customers can purchase. You can add more plans later.',
  payment: 'Set up how you receive payments from your customers. M-Pesa and bank transfers supported.',
  profile: 'Add your support phone so your customers can reach you when they need help.',
};

// ---------------------------------------------------------------------------
// Step 1: Router Auto-Provision
// ---------------------------------------------------------------------------

function RouterStep({ onComplete }: { onComplete: () => void }) {
  const { showAlert } = useAlert();
  const [vpnType, setVpnType] = useState<VpnType>('wireguard');
  const [generating, setGenerating] = useState(false);
  const [tokenResult, setTokenResult] = useState<ProvisionTokenResponse | null>(null);
  const [tokens, setTokens] = useState<ProvisionToken[]>([]);
  const [checking, setChecking] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadTokens = useCallback(async () => {
    try {
      const data = await api.getProvisionTokens();
      setTokens(data);
      const hasProvisioned = data.some(t => t.status === 'provisioned');
      if (hasProvisioned) {
        if (pollRef.current) clearInterval(pollRef.current);
        onComplete();
      }
    } catch { /* ignore */ }
  }, [onComplete]);

  useEffect(() => {
    loadTokens();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [loadTokens]);

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      const result = await api.createProvisionToken(vpnType);
      setTokenResult(result);
      showAlert('success', 'Token generated! Copy the command to your MikroTik terminal.');
      pollRef.current = setInterval(loadTokens, 8000);
    } catch (err) {
      showAlert('error', err instanceof Error ? err.message : 'Failed to generate token');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showAlert('error', 'Failed to copy. Please select and copy manually.');
    }
  };

  const handleCheckStatus = async () => {
    setChecking(true);
    await loadTokens();
    setChecking(false);
  };

  return (
    <div className="space-y-4">
      {/* Video Tutorial */}
      <div className="card overflow-hidden border-amber-500/20">
        <button
          onClick={() => {
            setShowVideo(v => {
              if (!v && videoRef.current) videoRef.current.currentTime = 0;
              return !v;
            });
          }}
          className="w-full flex items-center gap-3 p-4 text-left transition-colors hover:bg-amber-500/[0.04] active:opacity-70"
          style={{ touchAction: 'manipulation' }}
        >
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0 ring-1 ring-amber-500/20">
            <svg className="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-foreground">Watch: How to set up your router</p>
              {!showVideo && (
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-500 whitespace-nowrap">
                  Recommended
                </span>
              )}
            </div>
            <p className="text-xs text-foreground-muted mt-0.5">Quick walkthrough — takes under 2 minutes</p>
          </div>
          <svg
            className={`w-5 h-5 text-foreground-muted flex-shrink-0 transition-transform duration-200 ${showVideo ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <div
          className={`transition-all duration-300 ease-in-out overflow-hidden ${
            showVideo ? 'max-h-[80vh] opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="px-3 sm:px-4 pb-3 sm:pb-4">
            <div className="relative w-full rounded-xl overflow-hidden bg-black" style={{ aspectRatio: '16 / 9' }}>
              <video
                ref={videoRef}
                className="absolute inset-0 w-full h-full object-contain"
                controls
                controlsList="nodownload"
                playsInline
                webkit-playsinline="true"
                x5-playsinline="true"
                preload="none"
                poster="https://res.cloudinary.com/dhffnvn2d/video/upload/so_2,w_800,q_auto,f_jpg/v1776246895/video-project-2_WnpsbicQ_diwxkx.jpg"
                src="https://res.cloudinary.com/dhffnvn2d/video/upload/v1776246895/video-project-2_WnpsbicQ_diwxkx.mp4"
              >
                Your browser does not support video playback.
              </video>
            </div>
          </div>
        </div>
      </div>

      {!tokenResult ? (
        <>
          <div className="card p-4">
            <label className="block text-sm font-medium text-foreground mb-3">RouterOS Version</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setVpnType('wireguard')}
                className={`px-4 py-3 rounded-xl text-sm font-medium transition-all border ${
                  vpnType === 'wireguard'
                    ? 'border-blue-500 bg-blue-500/10 text-blue-500 ring-1 ring-blue-500/30'
                    : 'border-border bg-background-secondary text-foreground-muted hover:text-foreground'
                }`}
                style={{ touchAction: 'manipulation' }}
              >
                <span className="block font-semibold">RouterOS v7</span>
                <span className="block text-xs mt-0.5 opacity-70">WireGuard VPN</span>
              </button>
              <button
                onClick={() => setVpnType('l2tp')}
                className={`px-4 py-3 rounded-xl text-sm font-medium transition-all border ${
                  vpnType === 'l2tp'
                    ? 'border-purple-500 bg-purple-500/10 text-purple-500 ring-1 ring-purple-500/30'
                    : 'border-border bg-background-secondary text-foreground-muted hover:text-foreground'
                }`}
                style={{ touchAction: 'manipulation' }}
              >
                <span className="block font-semibold">RouterOS v6</span>
                <span className="block text-xs mt-0.5 opacity-70">L2TP VPN</span>
              </button>
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={generating}
            className="btn-primary w-full py-3 flex items-center justify-center gap-2 text-sm font-semibold active:opacity-70"
            style={{ touchAction: 'manipulation' }}
          >
            {generating ? (
              <>
                <div className="w-4 h-4 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Generate Provisioning Token
              </>
            )}
          </button>

          {tokens.filter(t => t.status === 'pending' && !t.expired).length > 0 && (
            <div className="card p-4 space-y-3">
              <h4 className="text-sm font-semibold text-foreground">Pending Tokens</h4>
              {tokens.filter(t => t.status === 'pending' && !t.expired).map(token => (
                <div key={token.id} className="rounded-lg border border-warning/20 bg-warning/5 p-3">
                  <p className="text-sm font-medium text-foreground">{token.router_name}</p>
                  <p className="text-xs text-foreground-muted">{token.identity} &middot; {token.vpn_ip}</p>
                  {token.command && (
                    <div className="mt-2">
                      <div className="bg-background-tertiary rounded-lg p-3 overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
                        <code className="text-xs font-mono text-foreground whitespace-pre">{token.command}</code>
                      </div>
                      <button
                        onClick={() => handleCopy(token.command!)}
                        className="mt-2 btn-primary w-full py-2 text-xs flex items-center justify-center gap-1.5 active:opacity-70"
                        style={{ touchAction: 'manipulation' }}
                      >
                        {copied ? (
                          <>
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            Copied!
                          </>
                        ) : (
                          <>
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                            Copy Command
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              ))}
              <button
                onClick={handleCheckStatus}
                disabled={checking}
                className="w-full py-2 text-xs font-medium text-foreground-muted hover:text-foreground border border-border rounded-xl flex items-center justify-center gap-1.5 transition-colors active:opacity-70"
                style={{ touchAction: 'manipulation' }}
              >
                <svg className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {checking ? 'Checking...' : 'Check if router connected'}
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="card p-4 space-y-4">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-success/10 border border-success/20">
            <svg className="w-5 h-5 text-success flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <div>
              <p className="text-sm font-medium text-foreground">Token Generated!</p>
              <p className="text-xs text-foreground-muted mt-0.5">
                Copy the command below and paste it into your MikroTik terminal.
              </p>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-foreground-muted">MikroTik Command</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 font-medium">
                {tokenResult.vpn_type === 'wireguard' ? 'RouterOS v7' : 'RouterOS v6'}
              </span>
            </div>
            <div className="bg-background-tertiary rounded-lg p-3 overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
              <code className="text-xs font-mono text-foreground whitespace-pre">{tokenResult.command}</code>
            </div>
          </div>

          <button
            onClick={() => handleCopy(tokenResult.command)}
            className="btn-primary w-full py-3 flex items-center justify-center gap-2 text-sm font-semibold active:opacity-70"
            style={{ touchAction: 'manipulation' }}
          >
            {copied ? (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                Copied to Clipboard!
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                Copy Command
              </>
            )}
          </button>

          <div className="text-center space-y-3 pt-2">
            <p className="text-xs text-foreground-muted">
              After pasting the command, your router will connect automatically.
            </p>
            <button
              onClick={handleCheckStatus}
              disabled={checking}
              className="w-full py-2.5 text-sm font-medium text-foreground-muted hover:text-foreground border border-border rounded-xl flex items-center justify-center gap-1.5 transition-colors active:opacity-70"
              style={{ touchAction: 'manipulation' }}
            >
              <svg className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {checking ? 'Checking...' : 'Check if router connected'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 2: Create Plan
// ---------------------------------------------------------------------------

function PlanStep({ onComplete }: { onComplete: () => void }) {
  const { showAlert } = useAlert();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    speed: '',
    price: '',
    duration_value: '1',
    duration_unit: 'DAYS' as 'HOURS' | 'DAYS' | 'MINUTES',
    connection_type: 'hotspot' as 'hotspot' | 'pppoe',
  });

  const update = (field: string, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.speed || !form.price) {
      showAlert('error', 'Please fill in all required fields.');
      return;
    }

    setLoading(true);
    try {
      const payload: CreatePlanRequest = {
        name: form.name,
        speed: form.speed,
        price: parseFloat(form.price),
        duration_value: parseInt(form.duration_value),
        duration_unit: form.duration_unit,
        connection_type: form.connection_type,
      };
      await api.createPlan(payload);
      showAlert('success', 'Plan created successfully!');
      onComplete();
    } catch (err) {
      showAlert('error', err instanceof Error ? err.message : 'Failed to create plan');
    } finally {
      setLoading(false);
    }
  };

  const durationUnits = [
    { value: 'MINUTES', label: 'Minutes', shortLabel: 'min' },
    { value: 'HOURS', label: 'Hours', shortLabel: 'hr' },
    { value: 'DAYS', label: 'Days', shortLabel: 'day' },
  ] as const;

  const planSummary = form.name || form.price || form.speed
    ? `${form.name || 'Unnamed'} — KES ${form.price || '0'} for ${form.duration_value} ${durationUnits.find(u => u.value === form.duration_unit)?.label.toLowerCase() || 'days'}`
    : '';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Plan Name & Connection Type */}
      <div className="card p-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Plan Name</label>
          <input
            type="text"
            value={form.name}
            onChange={e => update('name', e.target.value)}
            className="input"
            placeholder="e.g. Daily 10Mbps"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Connection Type</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => update('connection_type', 'hotspot')}
              className={`px-4 py-3 rounded-xl text-sm font-medium transition-all border ${
                form.connection_type === 'hotspot'
                  ? 'border-amber-500 bg-amber-500/10 text-amber-500 ring-1 ring-amber-500/30'
                  : 'border-border bg-background-secondary text-foreground-muted hover:text-foreground'
              }`}
              style={{ touchAction: 'manipulation' }}
            >
              <span className="block font-semibold">Hotspot</span>
              <span className="block text-xs mt-0.5 opacity-70">WiFi voucher</span>
            </button>
            <button
              type="button"
              onClick={() => update('connection_type', 'pppoe')}
              className={`px-4 py-3 rounded-xl text-sm font-medium transition-all border ${
                form.connection_type === 'pppoe'
                  ? 'border-amber-500 bg-amber-500/10 text-amber-500 ring-1 ring-amber-500/30'
                  : 'border-border bg-background-secondary text-foreground-muted hover:text-foreground'
              }`}
              style={{ touchAction: 'manipulation' }}
            >
              <span className="block font-semibold">PPPoE</span>
              <span className="block text-xs mt-0.5 opacity-70">Dedicated line</span>
            </button>
          </div>
        </div>
      </div>

      {/* Speed & Price */}
      <div className="card p-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Speed</label>
            <input
              type="text"
              value={form.speed}
              onChange={e => update('speed', e.target.value)}
              className="input"
              placeholder="e.g. 10M/5M"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Price (KES)</label>
            <input
              type="number"
              inputMode="decimal"
              value={form.price}
              onChange={e => update('price', e.target.value)}
              className="input"
              placeholder="100"
              min="0"
              step="1"
              required
            />
          </div>
        </div>
        <p className="text-[11px] text-foreground-muted/60 -mt-1">Speed format: download/upload (e.g. 10M/5M)</p>
      </div>

      {/* Duration — segmented buttons instead of hidden select */}
      <div className="card p-4 space-y-3">
        <label className="block text-sm font-medium text-foreground">Plan Duration</label>

        <div className="flex items-center gap-3">
          <div className="flex-shrink-0" style={{ width: '5rem' }}>
            <input
              type="number"
              inputMode="numeric"
              value={form.duration_value}
              onChange={e => update('duration_value', e.target.value)}
              className="input text-center"
              min="1"
              required
            />
          </div>
          <div className="flex-1 grid grid-cols-3 gap-1.5">
            {durationUnits.map(unit => (
              <button
                key={unit.value}
                type="button"
                onClick={() => update('duration_unit', unit.value)}
                className={`py-2.5 rounded-xl text-sm font-medium transition-all border text-center ${
                  form.duration_unit === unit.value
                    ? 'border-amber-500 bg-amber-500/10 text-amber-500 ring-1 ring-amber-500/30'
                    : 'border-border bg-background-secondary text-foreground-muted hover:text-foreground'
                }`}
                style={{ touchAction: 'manipulation' }}
              >
                <span className="hidden sm:inline">{unit.label}</span>
                <span className="sm:hidden">{unit.shortLabel}</span>
              </button>
            ))}
          </div>
        </div>

        <p className="text-[11px] text-foreground-muted/60">
          How long the plan stays active after purchase
        </p>
      </div>

      {/* Plan Preview */}
      {planSummary && (
        <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-amber-500/[0.06] border border-amber-500/15">
          <svg className="w-4 h-4 text-amber-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-xs text-foreground-muted">
            <span className="font-medium text-foreground">{planSummary}</span>
          </p>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="btn-primary w-full py-3 flex items-center justify-center gap-2 text-sm font-semibold active:opacity-70"
        style={{ touchAction: 'manipulation' }}
      >
        {loading ? (
          <>
            <div className="w-4 h-4 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" />
            Creating...
          </>
        ) : (
          'Create Plan'
        )}
      </button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Step 3: Payment Method
// ---------------------------------------------------------------------------

function PaymentStep({ onComplete }: { onComplete: () => void }) {
  const { showAlert } = useAlert();
  const [loading, setLoading] = useState(false);
  const [methodType, setMethodType] = useState<'mpesa_paybill' | 'bank_account'>('mpesa_paybill');
  const [form, setForm] = useState({
    label: '',
    mpesa_paybill_number: '',
    bank_paybill_number: '',
    bank_account_number: '',
  });

  const update = (field: string, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    try {
      const payload: CreatePaymentMethodRequest = {
        method_type: methodType as PaymentMethodType,
        label: form.label,
        ...(methodType === 'mpesa_paybill' && {
          mpesa_paybill_number: form.mpesa_paybill_number,
        }),
        ...(methodType === 'bank_account' && {
          bank_paybill_number: form.bank_paybill_number,
          bank_account_number: form.bank_account_number,
        }),
      };

      const created = await api.createPaymentMethod(payload);

      // Auto-assign to the first router if available
      try {
        const routers = await api.getRouters();
        if (routers.length > 0) {
          await api.assignRouterPaymentMethod(routers[0].id, created.id);
        }
      } catch { /* non-critical */ }

      showAlert('success', 'Payment method added!');
      onComplete();
    } catch (err) {
      showAlert('error', err instanceof Error ? err.message : 'Failed to add payment method');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="card p-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Payment Type</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMethodType('mpesa_paybill')}
              className={`px-4 py-3 rounded-xl text-sm font-medium transition-all border ${
                methodType === 'mpesa_paybill'
                  ? 'border-emerald-500 bg-emerald-500/10 text-emerald-500 ring-1 ring-emerald-500/30'
                  : 'border-border bg-background-secondary text-foreground-muted hover:text-foreground'
              }`}
              style={{ touchAction: 'manipulation' }}
            >
              <span className="block font-semibold">M-Pesa</span>
              <span className="block text-xs mt-0.5 opacity-70">Paybill number</span>
            </button>
            <button
              type="button"
              onClick={() => setMethodType('bank_account')}
              className={`px-4 py-3 rounded-xl text-sm font-medium transition-all border ${
                methodType === 'bank_account'
                  ? 'border-emerald-500 bg-emerald-500/10 text-emerald-500 ring-1 ring-emerald-500/30'
                  : 'border-border bg-background-secondary text-foreground-muted hover:text-foreground'
              }`}
              style={{ touchAction: 'manipulation' }}
            >
              <span className="block font-semibold">Bank</span>
              <span className="block text-xs mt-0.5 opacity-70">Account transfer</span>
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Label</label>
          <input
            type="text"
            value={form.label}
            onChange={e => update('label', e.target.value)}
            className="input"
            placeholder={methodType === 'mpesa_paybill' ? 'e.g. My M-Pesa' : 'e.g. My Bank Account'}
            required
          />
        </div>

        {methodType === 'mpesa_paybill' ? (
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Paybill Number</label>
            <input
              type="text"
              inputMode="numeric"
              value={form.mpesa_paybill_number}
              onChange={e => update('mpesa_paybill_number', e.target.value)}
              className="input"
              placeholder="e.g. 174379"
              required
            />
          </div>
        ) : (
          <>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Bank Paybill Number</label>
              <input
                type="text"
                inputMode="numeric"
                value={form.bank_paybill_number}
                onChange={e => update('bank_paybill_number', e.target.value)}
                className="input"
                placeholder="e.g. 522522"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Account Number</label>
              <input
                type="text"
                value={form.bank_account_number}
                onChange={e => update('bank_account_number', e.target.value)}
                className="input"
                placeholder="Your bank account number"
                required
              />
            </div>
          </>
        )}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="btn-primary w-full py-3 flex items-center justify-center gap-2 text-sm font-semibold active:opacity-70"
        style={{ touchAction: 'manipulation' }}
      >
        {loading ? (
          <>
            <div className="w-4 h-4 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" />
            Saving...
          </>
        ) : (
          'Add Payment Method'
        )}
      </button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Step 4: Profile (Support Phone)
// ---------------------------------------------------------------------------

function ProfileStep({ userName, onComplete }: { userName: string; onComplete: () => void }) {
  const { showAlert } = useAlert();
  const { updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) {
      showAlert('error', 'Please enter your support phone number.');
      return;
    }

    setLoading(true);
    try {
      const profile = await api.updateProfile({ support_phone: phone.trim() });
      updateUser({ support_phone: profile.support_phone });
      showAlert('success', 'Profile updated!');
      onComplete();
    } catch (err) {
      showAlert('error', err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="card p-4 space-y-4">
        {userName && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-background-secondary">
            <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 font-bold text-sm">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{userName}</p>
              <p className="text-xs text-foreground-muted">Your organization</p>
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Support Phone Number</label>
          <input
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            className="input"
            placeholder="+254 7XX XXX XXX"
            required
          />
          <p className="text-[11px] text-foreground-muted/60 mt-1">
            This number is shown to your customers for support
          </p>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="btn-primary w-full py-3 flex items-center justify-center gap-2 text-sm font-semibold active:opacity-70"
        style={{ touchAction: 'manipulation' }}
      >
        {loading ? (
          <>
            <div className="w-4 h-4 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" />
            Saving...
          </>
        ) : (
          'Save & Finish Setup'
        )}
      </button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Celebration Screen
// ---------------------------------------------------------------------------

function CelebrationScreen({ completed, onFinish }: { completed: Record<string, boolean>; onFinish: () => void }) {
  const completedCount = Object.keys(completed).length;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      {/* Confetti */}
      <div className="confetti-container" aria-hidden="true">
        {Array.from({ length: 40 }).map((_, i) => (
          <div
            key={i}
            className="confetti-piece"
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 3}s`,
              backgroundColor: ['#f59e0b', '#f97316', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444'][i % 6],
            }}
          />
        ))}
      </div>

      <div className="relative z-10 text-center max-w-sm mx-auto">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-success/10 flex items-center justify-center animate-bounce-once">
          <svg className="w-10 h-10 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
          {completedCount === STEPS.length ? "You're All Set!" : 'Great Progress!'}
        </h1>
        <p className="text-foreground-muted mb-6">
          {completedCount === STEPS.length
            ? 'Your ISP is ready to go. Start managing your network from the dashboard.'
            : `You completed ${completedCount} of ${STEPS.length} steps. You can finish the rest from your dashboard.`
          }
        </p>

        {completedCount > 0 && (
          <div className="card p-4 mb-6 text-left space-y-2">
            {STEPS.map(s => (
              <div key={s.id} className="flex items-center gap-3 py-1">
                {completed[s.id] ? (
                  <svg className="w-5 h-5 text-success flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <div className="w-5 h-5 rounded-full border-2 border-foreground-muted/20 flex-shrink-0" />
                )}
                <span className={`text-sm ${completed[s.id] ? 'text-foreground' : 'text-foreground-muted'}`}>
                  {s.title}
                </span>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={onFinish}
          className="btn-primary w-full py-3 text-base font-semibold active:opacity-70"
          style={{ touchAction: 'manipulation', paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))' }}
        >
          Go to Dashboard
        </button>
      </div>

      <style jsx>{`
        .confetti-container {
          position: fixed;
          inset: 0;
          pointer-events: none;
          overflow: hidden;
          z-index: 0;
        }
        .confetti-piece {
          position: absolute;
          top: -10px;
          width: 8px;
          height: 8px;
          border-radius: 2px;
          animation: confetti-fall linear forwards;
          opacity: 0.8;
        }
        @keyframes confetti-fall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        @keyframes bounce-once {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        .animate-bounce-once {
          animation: bounce-once 0.6s ease-in-out;
        }
      `}</style>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

function RouterIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
    </svg>
  );
}

function PlanIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function PaymentIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  );
}

function ProfileIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}
