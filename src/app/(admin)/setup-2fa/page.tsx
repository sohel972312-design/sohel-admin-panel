'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function Setup2FAPage() {
  const router = useRouter();
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [state, setState] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    fetch('/api/auth/setup-2fa')
      .then(r => r.json())
      .then(data => {
        setQrCode(data.qrCode || '');
        setSecret(data.secret || '');
        setPageLoading(false);
        setTimeout(() => inputRefs.current[0]?.focus(), 100);
      })
      .catch(() => setPageLoading(false));
  }, []);

  const verify = async (otp: string) => {
    if (loading) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/auth/setup-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp }),
      });
      const data = await res.json();
      if (res.ok) {
        setState('success');
        setTimeout(() => router.push('/'), 1000);
      } else {
        setState('error');
        setErrorMsg(data.error || 'Invalid code');
        setTimeout(() => {
          setState('idle');
          setDigits(['', '', '', '', '', '']);
          setLoading(false);
          setTimeout(() => inputRefs.current[0]?.focus(), 50);
        }, 800);
      }
    } catch {
      setState('error');
      setErrorMsg('Network error');
      setLoading(false);
    }
  };

  const handleChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const updated = [...digits];
    updated[index] = value;
    setDigits(updated);
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
    if (value && index === 5 && updated.join('').length === 6) verify(updated.join(''));
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) inputRefs.current[index - 1]?.focus();
  };

  const borderClass = state === 'success' ? 'border-green-500' : state === 'error' ? 'border-red-500' : 'border-gray-300 dark:border-gray-700 focus:border-brand-500';

  if (pageLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto py-10 px-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-8 text-center shadow-sm">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-brand-50 dark:bg-brand-900/20 mb-4">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L4 5v6c0 5.5 3.8 10.7 8 12 4.2-1.3 8-6.5 8-12V5l-8-3z" className="fill-brand-500" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Setup 2-Factor Authentication</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Scan the QR code with <strong>Google Authenticator</strong>, then enter the 6-digit code to activate.
        </p>

        {qrCode && (
          <div className="flex justify-center mb-4">
            <div className="bg-white p-3 rounded-xl border border-gray-200 inline-block">
              <Image src={qrCode} alt="QR Code" width={180} height={180} />
            </div>
          </div>
        )}

        {secret && (
          <div className="mb-6">
            <p className="text-xs text-gray-400 mb-1">Manual entry key:</p>
            <code className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-3 py-1 rounded text-sm font-mono tracking-widest">
              {secret}
            </code>
          </div>
        )}

        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Enter the code from the app:</p>

        <div className="flex justify-center gap-2 mb-4">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => { inputRefs.current[i] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={d}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              disabled={loading && state !== 'idle'}
              className={`w-11 h-13 text-center text-xl font-bold rounded-xl border-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-white outline-none transition-all duration-300 focus:ring-2 ${borderClass}`}
            />
          ))}
        </div>

        {errorMsg && <p className="text-sm text-red-600 dark:text-red-400 mb-2">{errorMsg}</p>}
        {state === 'success' && <p className="text-sm text-green-600 font-medium">✓ 2FA Activated! Redirecting...</p>}
      </div>
    </div>
  );
}
