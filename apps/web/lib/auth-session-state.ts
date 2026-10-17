const SIGNED_OUT_KEY = 'nexus_explicitly_signed_out';
const SESSION_EPOCH_KEY = 'nexus_auth_session_epoch';
let fallbackEpoch = 0;

export function getAuthSessionEpoch(): string {
  if (typeof window === 'undefined') return String(fallbackEpoch);
  try {
    return window.localStorage.getItem(SESSION_EPOCH_KEY) ?? String(fallbackEpoch);
  } catch {
    return String(fallbackEpoch);
  }
}

function advanceEpoch(): void {
  if (typeof window === 'undefined') return;
  try {
    const stored = Number(window.localStorage.getItem(SESSION_EPOCH_KEY));
    fallbackEpoch = Math.max(fallbackEpoch, Number.isFinite(stored) ? stored : 0) + 1;
    window.localStorage.setItem(SESSION_EPOCH_KEY, String(fallbackEpoch));
  } catch {
    fallbackEpoch += 1;
  }
}

export function hasExplicitlySignedOut(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(SIGNED_OUT_KEY) === '1';
  } catch {
    return false;
  }
}

export function markExplicitlySignedOut(): void {
  if (typeof window === 'undefined') return;
  advanceEpoch();
  try {
    window.localStorage.setItem(SIGNED_OUT_KEY, '1');
  } catch {
    // Firebase and API sign-out still run if storage is unavailable.
  }
}

export function clearExplicitSignOut(): void {
  if (typeof window === 'undefined') return;
  advanceEpoch();
  try {
    window.localStorage.removeItem(SIGNED_OUT_KEY);
  } catch {
    // Authentication can proceed when browser storage is unavailable.
  }
}
