'use client';
import { useEffect, useState, useRef } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface UserInfo {
  email: string;
  phone: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function maskEmail(email: string) {
  const [local, domain] = email.split('@');
  if (!local || !domain) return email;
  return local.slice(0, 2) + '***' + (local.slice(-1) || '') + '@' + domain;
}

function maskPhone(phone: string) {
  const digits = phone.replace(/\D/g, '');
  return '•••• •••• ' + digits.slice(-4);
}

// ─── OTP Boxes ────────────────────────────────────────────────────────────────
function OtpBoxes({
  onSubmit,
  loading,
  state,
}: {
  onSubmit: (code: string) => void;
  loading: boolean;
  state: 'idle' | 'success' | 'error';
}) {
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const border =
    state === 'success'
      ? 'border-green-500'
      : state === 'error'
      ? 'border-red-500'
      : 'border-gray-300 dark:border-gray-600 focus:border-brand-500';

  const handleChange = (i: number, val: string) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...digits];
    next[i] = val;
    setDigits(next);
    if (val && i < 5) refs.current[i + 1]?.focus();
    if (val && i === 5 && next.join('').length === 6) onSubmit(next.join(''));
  };

  const handleKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) refs.current[i - 1]?.focus();
  };

  const reset = () => {
    setDigits(['', '', '', '', '', '']);
    setTimeout(() => refs.current[0]?.focus(), 50);
  };

  useEffect(() => {
    if (state === 'error') setTimeout(reset, 800);
  }, [state]);

  return (
    <div className="flex gap-2 mt-3">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKey(i, e)}
          disabled={loading}
          className={`w-10 h-11 text-center text-lg font-bold rounded-xl border-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none transition-all ${border}`}
        />
      ))}
    </div>
  );
}

// ─── Card: Change Password ────────────────────────────────────────────────────
function ChangePasswordCard() {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setLoading(false);
    if (res.ok) {
      setMsg({ type: 'success', text: 'Password updated successfully!' });
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } else {
      setMsg({ type: 'error', text: data.error || 'Failed to update password' });
    }
  };

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" stroke="#465fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h2 className="text-base font-semibold text-gray-800 dark:text-white">Change Password</h2>
      </div>

      <form onSubmit={submit} className="space-y-4">
        {(['currentPassword', 'newPassword', 'confirmPassword'] as const).map((field) => (
          <div key={field}>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              {field === 'currentPassword' ? 'Current Password' : field === 'newPassword' ? 'New Password' : 'Confirm New Password'}
            </label>
            <input
              type="password"
              value={form[field]}
              onChange={(e) => setForm((p) => ({ ...p, [field]: e.target.value }))}
              required
              className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            />
          </div>
        ))}

        {msg && (
          <p className={`text-sm ${msg.type === 'success' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {msg.text}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 px-4 text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 disabled:opacity-60 rounded-xl transition-colors"
        >
          {loading ? 'Updating…' : 'Update Password'}
        </button>
      </form>
    </div>
  );
}

// ─── Card: Change Email ───────────────────────────────────────────────────────
function ChangeEmailCard({ currentEmail }: { currentEmail: string }) {
  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [newEmail, setNewEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpState, setOtpState] = useState<'idle' | 'success' | 'error'>('idle');
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const sendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    const res = await fetch('/api/auth/change-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newEmail }),
    });
    const data = await res.json();
    setLoading(false);
    if (res.ok) {
      setStep('otp');
      setMsg({ type: 'success', text: `Verification code sent to ${newEmail}` });
    } else {
      setMsg({ type: 'error', text: data.error || 'Failed to send code' });
    }
  };

  const verifyOtp = async (otp: string) => {
    setLoading(true);
    const res = await fetch('/api/auth/change-email', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ otp }),
    });
    const data = await res.json();
    if (res.ok) {
      setOtpState('success');
      setMsg({ type: 'success', text: `Email updated to ${data.newEmail}` });
      setTimeout(() => window.location.reload(), 1500);
    } else {
      setOtpState('error');
      setMsg({ type: 'error', text: data.error || 'Invalid OTP' });
      setTimeout(() => { setOtpState('idle'); setLoading(false); }, 900);
    }
  };

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h2 className="text-base font-semibold text-gray-800 dark:text-white">Change Email</h2>
      </div>

      <div className="mb-4 flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-xl">
        <span className="text-xs text-gray-400 dark:text-gray-500">Current:</span>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{maskEmail(currentEmail)}</span>
      </div>

      {step === 'form' ? (
        <form onSubmit={sendOtp} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">New Email Address</label>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              required
              placeholder="new@example.com"
              className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            />
          </div>
          {msg && (
            <p className={`text-sm ${msg.type === 'success' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {msg.text}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-60 rounded-xl transition-colors"
          >
            {loading ? 'Sending code…' : 'Send Verification Code'}
          </button>
        </form>
      ) : (
        <div>
          {msg && (
            <p className={`text-sm mb-3 ${msg.type === 'success' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {msg.text}
            </p>
          )}
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
            Enter the 6-digit code sent to <strong>{newEmail}</strong>:
          </p>
          <OtpBoxes onSubmit={verifyOtp} loading={loading} state={otpState} />
          <button
            onClick={() => { setStep('form'); setMsg(null); }}
            className="mt-3 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            ← Change email address
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Card: Change Phone ───────────────────────────────────────────────────────
function ChangePhoneCard({ currentPhone }: { currentPhone: string | null }) {
  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [newPhone, setNewPhone] = useState('');
  const [channel, setChannel] = useState<'sms' | 'whatsapp'>('sms');
  const [loading, setLoading] = useState(false);
  const [otpState, setOtpState] = useState<'idle' | 'success' | 'error'>('idle');
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const sendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    const res = await fetch('/api/auth/change-phone', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newPhone, channel }),
    });
    const data = await res.json();
    setLoading(false);
    if (res.ok) {
      setStep('otp');
      setMsg({ type: 'success', text: `Code sent via ${channel === 'whatsapp' ? 'WhatsApp' : 'SMS'} to ${newPhone}` });
    } else {
      setMsg({ type: 'error', text: data.error || 'Failed to send code' });
    }
  };

  const verifyOtp = async (otp: string) => {
    setLoading(true);
    const res = await fetch('/api/auth/verify-phone-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ otp }),
    });
    const data = await res.json();
    if (res.ok) {
      setOtpState('success');
      setMsg({ type: 'success', text: `Phone updated to ${data.newPhone}` });
      setTimeout(() => window.location.reload(), 1500);
    } else {
      setOtpState('error');
      setMsg({ type: 'error', text: data.error || 'Invalid OTP' });
      setTimeout(() => { setOtpState('idle'); setLoading(false); }, 900);
    }
  };

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h2 className="text-base font-semibold text-gray-800 dark:text-white">Change Phone</h2>
      </div>

      {currentPhone && (
        <div className="mb-4 flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-xl">
          <span className="text-xs text-gray-400 dark:text-gray-500">Current:</span>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{maskPhone(currentPhone)}</span>
        </div>
      )}

      {step === 'form' ? (
        <form onSubmit={sendOtp} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">New Phone Number</label>
            <input
              type="tel"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              required
              placeholder="+91 98765 43210"
              className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Send code via</label>
            <div className="flex gap-3">
              {(['sms', 'whatsapp'] as const).map((ch) => (
                <label
                  key={ch}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 cursor-pointer transition-all text-sm font-medium ${
                    channel === ch
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                      : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="channel"
                    value={ch}
                    checked={channel === ch}
                    onChange={() => setChannel(ch)}
                    className="sr-only"
                  />
                  {ch === 'sms' ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" /><path d="M12 0C5.373 0 0 5.373 0 12c0 2.025.507 3.934 1.395 5.604L0 24l6.545-1.369A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.955 0-3.792-.499-5.391-1.371L3 22l1.404-4.503A9.96 9.96 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" /></svg>
                  )}
                  {ch === 'sms' ? 'SMS' : 'WhatsApp'}
                </label>
              ))}
            </div>
          </div>

          {msg && (
            <p className={`text-sm ${msg.type === 'success' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {msg.text}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 text-sm font-medium text-white bg-green-500 hover:bg-green-600 disabled:opacity-60 rounded-xl transition-colors"
          >
            {loading ? 'Sending code…' : 'Send Verification Code'}
          </button>
        </form>
      ) : (
        <div>
          {msg && (
            <p className={`text-sm mb-3 ${msg.type === 'success' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {msg.text}
            </p>
          )}
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
            Enter the 6-digit code sent to <strong>{newPhone}</strong>:
          </p>
          <OtpBoxes onSubmit={verifyOtp} loading={loading} state={otpState} />
          <button
            onClick={() => { setStep('form'); setMsg(null); }}
            className="mt-3 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            ← Change phone number
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data) => {
        if (data.email) setUser({ email: data.email, phone: data.phone });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
      <h3 className="mb-6 text-lg font-semibold text-gray-800 dark:text-white/90">
        Account Settings
      </h3>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <ChangePasswordCard />
        <ChangeEmailCard currentEmail={user?.email || ''} />
        <ChangePhoneCard currentPhone={user?.phone || null} />
      </div>
    </div>
  );
}
