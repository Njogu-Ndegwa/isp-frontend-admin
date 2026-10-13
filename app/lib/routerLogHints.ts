/**
 * Plain-language explanations for the MikroTik log lines that show up in a
 * customer's activity log. Resellers and field technicians see the router's
 * own words ("<pppoe-jane>: terminating... - peer is not responding"); this
 * says what that usually means and what to check.
 *
 * Order matters: the first matching rule wins, so specific causes come before
 * generic ones ("terminating" alone is just "the session ended").
 */

export interface RouterLogHint {
  /** What happened, in a reseller's words. */
  meaning: string;
  /** What to check, when there is something to check. */
  action?: string;
}

const RULES: { test: RegExp; hint: RouterLogHint }[] = [
  {
    test: /authentication failed|auth.*fail|bad password|invalid (user|password)|chap.*fail|pap.*fail/i,
    hint: {
      meaning: 'The customer\'s router tried to log in but the username or password was rejected.',
      action: 'Check the PPPoE username and password typed into the customer\'s router match this account.',
    },
  },
  {
    test: /peer is not responding|not responding|lcp.*(timeout|time out)|no response/i,
    hint: {
      meaning: 'The customer\'s router stopped answering, so the session was closed.',
      action: 'Usually a power cut, an unplugged or damaged cable, or a weak radio link at the customer\'s side.',
    },
  },
  {
    test: /already (connected|logged in)|duplicate|another session/i,
    hint: {
      meaning: 'Another device tried to log in with the same account while it was already connected.',
      action: 'Make sure only one router uses these PPPoE details.',
    },
  },
  {
    test: /no (free )?(ip )?address|pool.*(exhaust|full|empty)|could not allocate/i,
    hint: {
      meaning: 'The router ran out of IP addresses to give to customers.',
      action: 'Enlarge the PPPoE address pool on the router.',
    },
  },
  {
    test: /administrator request|admin(istrator)? disconnect|disconnected by admin/i,
    hint: {
      meaning: 'The session was ended from the router or by the billing system (for example on expiry or a plan change).',
    },
  },
  {
    test: /session[- ]timeout/i,
    hint: { meaning: 'The session reached its time limit and was ended.' },
  },
  {
    test: /hung ?up|peer (closed|terminated)|user request/i,
    hint: {
      meaning: 'The customer\'s router ended the session itself, often because it restarted or was reconfigured.',
    },
  },
  {
    test: /waiting for call/i,
    hint: { meaning: 'The customer\'s router is reaching the server and starting to connect.' },
  },
  {
    test: /disconnected.*(extensive data loss|signal|too many|unicast key|group key)/i,
    hint: {
      meaning: 'The device dropped off the Wi-Fi.',
      action: 'Often weak signal: the device may be too far from the router or behind walls.',
    },
  },
  {
    test: /\bauthenticated\b/i,
    hint: { meaning: 'The username and password were accepted.' },
  },
  {
    test: /\blogged in\b/i,
    hint: { meaning: 'The customer is connected and has internet.' },
  },
  {
    test: /\blogged out\b/i,
    hint: { meaning: 'The customer\'s session ended. The numbers after it are the time online and data used.' },
  },
  {
    test: /\bconnected\b(?!.*dis)/i,
    hint: { meaning: 'The connection was set up.' },
  },
  {
    test: /terminating|disconnected/i,
    hint: { meaning: 'The session ended.' },
  },
  {
    test: /\bdeassigned\b/i,
    hint: { meaning: 'The device gave back its IP address (it left or went to sleep).' },
  },
  {
    test: /\bassigned\b/i,
    hint: { meaning: 'The device joined the network and got an IP address.' },
  },
];

export function explainRouterLog(message: string | null | undefined): RouterLogHint | null {
  if (!message) return null;
  for (const rule of RULES) {
    if (rule.test.test(message)) return rule.hint;
  }
  return null;
}
