import jwt from 'jsonwebtoken';

const STEP1_SECRET = process.env.JWT_STEP1_SECRET || 'step1_fallback_secret_change_me';

export interface Step1Payload {
  adminId: string;
  step: 'awaiting_otp';
}

export function signStep1Token(adminId: string): string {
  return jwt.sign(
    { adminId, step: 'awaiting_otp' } satisfies Step1Payload,
    STEP1_SECRET,
    { expiresIn: '5m' }
  );
}

export function verifyStep1Token(token: string): Step1Payload {
  return jwt.verify(token, STEP1_SECRET) as Step1Payload;
}
