// In-memory rate limiter — no Redis needed
// Max 5 failed attempts per IP within 10 minutes

interface RateLimitEntry {
  count: number;
  firstAttemptTime: number;
}

const store = new Map<string, RateLimitEntry>();

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 10 * 60 * 1000; // 10 minutes

export function checkRateLimit(ip: string): { blocked: boolean; remaining: number } {
  const now = Date.now();
  const entry = store.get(ip);

  if (!entry || now - entry.firstAttemptTime > WINDOW_MS) {
    // Fresh window
    store.set(ip, { count: 1, firstAttemptTime: now });
    return { blocked: false, remaining: MAX_ATTEMPTS - 1 };
  }

  if (entry.count >= MAX_ATTEMPTS) {
    return { blocked: true, remaining: 0 };
  }

  entry.count += 1;
  store.set(ip, entry);
  return { blocked: false, remaining: MAX_ATTEMPTS - entry.count };
}

export function resetRateLimit(ip: string): void {
  store.delete(ip);
}
