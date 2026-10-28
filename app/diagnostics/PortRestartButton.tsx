'use client';

import { useState } from 'react';
import ConfirmDialog from '../components/ConfirmDialog';
import { api } from '../lib/api';
import { useAlert } from '../context/AlertContext';
import { useT } from '../lib/i18n';
import { restartButtonState } from '../lib/portRestart';
import type { PortRestartOption } from '../lib/types';

/**
 * "Restart" for one LAN port: power-cycles the PoE (or turns the port off and
 * on) so a hung access point behind it comes back. The backend refuses WAN,
 * management and other guarded ports too; this only greys them out.
 */
export default function PortRestartButton({
  routerId,
  port,
  option,
  loadingOptions,
  busy,
  onRunningChange,
  onDone,
  inlineHint,
}: {
  routerId: number;
  port: string;
  option: PortRestartOption | undefined;
  loadingOptions?: boolean;
  busy?: boolean;
  onRunningChange?: (running: boolean) => void;
  onDone?: () => void;
  /** Phones have no hover: show why the button is off under it instead. */
  inlineHint?: boolean;
}) {
  const t = useT();
  const { showAlert } = useAlert();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const state = restartButtonState(t, option, { loadingOptions, busy: busy && !running });

  const restart = async () => {
    try {
      setRunning(true);
      onRunningChange?.(true);
      await api.restartRouterPort(routerId, port);
      showAlert('success', t('{port} restarted. Devices on it reconnect in a few seconds.', { port }), 7000);
      setConfirmOpen(false);
      onDone?.();
    } catch (err) {
      showAlert('error', err instanceof Error ? err.message : t('Could not restart {port}', { port }), 9000);
    } finally {
      setRunning(false);
      onRunningChange?.(false);
    }
  };

  return (
    <>
      <span title={state.hint ?? undefined} className="inline-flex flex-col items-end gap-0.5">
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          disabled={state.disabled || running}
          aria-label={t('Restart {port}', { port })}
          className="btn-ghost text-xs px-2 py-1 disabled:opacity-40 disabled:cursor-not-allowed active:opacity-70"
          style={{ touchAction: 'manipulation' }}
        >
          {running ? t('Restarting...') : t('Restart')}
        </button>
        {inlineHint && state.disabled && state.hint && (
          <span className="text-[10px] text-foreground-muted text-right max-w-[14rem]">{state.hint}</span>
        )}
      </span>
      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => { if (!running) setConfirmOpen(false); }}
        onConfirm={restart}
        title={t('Restart {port}?', { port })}
        message={t('Devices on this port will drop for about 10 seconds')}
        confirmLabel={t('Restart')}
        cancelLabel={t('Cancel')}
        variant="warning"
        loading={running}
      />
    </>
  );
}
