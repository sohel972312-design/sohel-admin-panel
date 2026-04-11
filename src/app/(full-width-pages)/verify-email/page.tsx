'use client';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [newEmail, setNewEmail] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No verification token found in the link.');
      return;
    }

    fetch(`/api/auth/verify-email-token?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const data = await res.json();
        if (res.ok) {
          setStatus('success');
          setNewEmail(data.newEmail || '');
          setTimeout(() => router.push('/profile'), 3000);
        } else {
          setStatus('error');
          setMessage(data.error || 'Verification failed');
        }
      })
      .catch(() => {
        setStatus('error');
        setMessage('Network error. Please try again.');
      });
  }, [token, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-8 text-center shadow-sm">
          {status === 'loading' && (
            <>
              <div className="flex justify-center mb-4">
                <div className="animate-spin w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full" />
              </div>
              <h1 className="text-xl font-semibold text-gray-800 dark:text-white">Verifying your email…</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Please wait a moment.</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                    <path d="M5 13l4 4L19 7" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
              <h1 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Email Verified!</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                Your email has been successfully updated to:
              </p>
              <p className="font-semibold text-brand-500 text-sm mb-4">{newEmail}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">Redirecting to your profile in 3 seconds…</p>
              <Link
                href="/profile"
                className="mt-4 inline-block text-sm font-medium text-brand-500 hover:underline"
              >
                Go to Profile now
              </Link>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                    <path d="M6 18L18 6M6 6l12 12" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                </div>
              </div>
              <h1 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Verification Failed</h1>
              <p className="text-sm text-red-500 dark:text-red-400 mb-4">{message}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                The link may have expired or already been used. You can request a new verification from your profile.
              </p>
              <Link
                href="/profile"
                className="inline-block px-5 py-2 text-sm font-medium bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors"
              >
                Back to Profile
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full" />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
