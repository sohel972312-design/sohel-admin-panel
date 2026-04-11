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
  return Math.floor(100000 + Math.random() * 900000).toString();
}
