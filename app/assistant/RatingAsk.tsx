'use client';

/*
 * What people think of the assistant, asked quietly. The ask is one line under
 * the latest answer (five stars and a close), drawn only when the server says
 * this person is due one: after their first few questions, then not again for
 * a few days whether they answered or not, and never after a few times (see
 * app/services/assistant/ratings.py). Tapping a star opens a short review and
 * an optional idea; the idea goes to the shared feedback board, where other
 * resellers can vote on it. The same panel opens from the menu at any time.
 */
import { useEffect, useRef, useState } from 'react';
import { assistantApi } from '../lib/assistant';
import { useT } from '../lib/i18n';
import { CheckIcon, CloseIcon, SpinnerIcon, StarIcon } from './icons';

const field = 'w-full min-w-0 resize-none rounded-[12px] border border-line-strong bg-[var(--ai-bg)] px-3.5 py-2.5 text-[16px] leading-snug text-ink-1 outline-none transition-colors placeholder:text-ink-3 focus:border-accent/70 focus:shadow-[0_0_0_3px_var(--ai-accent-soft)]';

function Stars({ value, onPick, size = 26, label }: { value: number; onPick: (n: number) => void; size?: number; label: string }) {
  const [hover, setHover] = useState(0);
  const lit = hover || value;
  return (
    <div className="flex items-center" role="radiogroup" aria-label={label} onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={`${n} / 5`}
          onClick={() => onPick(n)} onMouseEnter={() => setHover(n)}
          className="ai-tap flex h-10 w-9 items-center justify-center rounded-[10px] transition-transform active:scale-90">
          <StarIcon width={size} height={size} filled={n <= lit}
            className={n <= lit ? 'text-[var(--ai-warn)]' : 'text-ink-3'} />
        </button>
      ))}
    </div>
  );
}

export default function RatingAsk({ mode, onClose }: {
  /** 'ask': the quiet line under an answer; 'open': opened from the menu */
  mode: 'ask' | 'open';
  onClose: () => void;
}) {
  const t = useT();
  const [rating, setRating] = useState(0);
  const [open, setOpen] = useState(mode === 'open');
  const [review, setReview] = useState('');
  const [idea, setIdea] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [ideaPosted, setIdeaPosted] = useState(false);
  const told = useRef(false);

  // the ask was seen: it stays away for a few days after this, answered or not
  useEffect(() => {
    if (mode !== 'ask' || told.current) return;
    told.current = true;
    assistantApi.ratingShown().catch(() => { /* pacing is best effort */ });
  }, [mode]);

  // from the menu: start from what they said before
  useEffect(() => {
    if (mode !== 'open') return;
    assistantApi.myRating().then((r) => {
      if (r.rating) { setRating(r.rating.rating); setReview(r.rating.review); }
    }).catch(() => { /* a fresh form is fine */ });
  }, [mode]);

  const pick = (n: number) => { setRating(n); setOpen(true); };
  const notNow = () => {
    if (mode === 'ask') assistantApi.ratingDismiss().catch(() => { /* best effort */ });
    onClose();
  };
  const send = async () => {
    if (!rating) return;
    setState('sending');
    try {
      await assistantApi.rate(rating, review, mode === 'ask' ? 'prompt' : 'menu');
      const text = idea.trim();
      if (text.length >= 10) {
        try {
          await assistantApi.postIdea(text, rating);
          setIdeaPosted(true);
        } catch { /* the rating is in; the idea is a bonus */ }
      }
      setState('done');
    } catch {
      setState('error');
    }
  };

  if (state === 'done') {
    return (
      <div className="ai-rise my-4 flex items-start gap-3 rounded-[14px] border border-line bg-surface-1 px-3.5 py-3 text-[13.5px] text-ink-2" role="status">
        <CheckIcon className="mt-0.5 shrink-0 text-[var(--ai-text-good)]" />
        <p className="m-0 min-w-0 flex-1">
          {t('Thank you. The Bitwave team reads every review.')}
          {ideaPosted ? <> {t('Your idea is on the ideas board, where other resellers can vote for it.')}</> : null}
        </p>
        <button type="button" className="ai-btn ai-btn-quiet -my-1 -mr-1.5 shrink-0" onClick={onClose} aria-label={t('Close')}><CloseIcon /></button>
      </div>
    );
  }

  if (!open) {
    // the quiet line: a question and five stars, nothing more until they tap one
    return (
      <div className="ai-rise my-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-[14px] border border-line px-3.5 py-1.5">
        <p className="m-0 min-w-0 flex-1 basis-[180px] text-[13px] text-ink-2">{t('How is the new Bitwave working for you?')}</p>
        <div className="flex items-center">
          <Stars value={rating} onPick={pick} size={22} label={t('Rate the assistant')} />
          <button type="button" className="ai-btn ai-btn-quiet -mr-1.5 shrink-0" onClick={notNow} aria-label={t('Not now')}><CloseIcon /></button>
        </div>
      </div>
    );
  }

  const prompt = rating === 0 ? t('Tap a star')
    : rating <= 2 ? t('What went wrong? Tell us so we can fix it.')
      : rating === 3 ? t('What would make it better?')
        : t('What do you like about it?');
  return (
    <section className="ai-card ai-rise my-4 px-4 py-3.5" aria-label={t('Rate the assistant')}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="ai-display m-0 text-[15px] font-semibold text-ink-1">{t('How is the new Bitwave working for you?')}</h3>
          <p className="m-0 mt-0.5 text-[12.5px] text-ink-3">{t('Your rating and review go straight to the Bitwave team.')}</p>
        </div>
        <button type="button" className="ai-btn ai-btn-quiet -mr-1.5 -mt-1 shrink-0" onClick={notNow} aria-label={t('Close')}><CloseIcon /></button>
      </div>
      <div className="mt-2"><Stars value={rating} onPick={setRating} label={t('Rate the assistant')} /></div>
      <label className="mt-2 block">
        <span className="ai-eyebrow mb-1.5 block">{t('Your review')} <span className="normal-case tracking-normal text-ink-3">· {t('optional')}</span></span>
        <textarea rows={2} maxLength={2000} value={review} onChange={(e) => setReview(e.target.value)} placeholder={prompt} className={field} />
      </label>
      <label className="mt-3 block">
        <span className="ai-eyebrow mb-1.5 block">{t('An idea to make it better')} <span className="normal-case tracking-normal text-ink-3">· {t('optional')}</span></span>
        <textarea rows={2} maxLength={1000} value={idea} onChange={(e) => setIdea(e.target.value)}
          placeholder={t('Something it should do, or do differently')} className={field} />
        {idea.trim().length > 0 && idea.trim().length < 10 ? <span className="mt-1 block text-[11.5px] text-ink-3">{t('A few more words, please (10 letters or more).')}</span> : null}
      </label>
      {state === 'error' ? <p className="m-0 mt-2 text-[12.5px] text-[var(--ai-text-bad)]">{t('That did not send. Try again.')}</p> : null}
      <div className="mt-3 flex items-center gap-2">
        <button type="button" className="ai-btn ai-btn-primary" disabled={!rating || state === 'sending'} onClick={() => void send()}>
          {state === 'sending' ? <SpinnerIcon /> : null}{t('Send')}
        </button>
        <button type="button" className="ai-btn ai-btn-ghost" onClick={notNow}>{t('Not now')}</button>
      </div>
    </section>
  );
}
