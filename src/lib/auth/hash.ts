import crypto from 'crypto';

export function sha256(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

export function randomToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function randomUUID(): string {
  return crypto.randomUUID();
}

export function random6Digit(): string {
  // crypto.randomInt is cryptographically secure; range [100000, 1000000)
  return crypto.randomInt(100_000, 1_000_000).toString();
}
