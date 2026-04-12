"use client";
import { useRouter } from "next/navigation";
import React, { useRef, useState, useEffect } from "react";

export default function VerifyOtpPage() {
  const router = useRouter();
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [state, setState] = useState<"idle" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const borderColor = () => {
    if (state === "success") return "border-green-500 ring-green-300";
    if (state === "error") return "border-red-500 ring-red-300";
    return "border-gray-300 dark:border-gray-700 focus:border-brand-500 focus:ring-brand-300";
  };

  const verify = async (otp: string) => {
    if (loading) return;
    setLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp }),
      });

      const data = await res.json();

      if (res.ok) {
        setState("success");
        setTimeout(() => {
          window.location.replace(data.redirect || "/");
        }, 600);
      } else {
        setState("error");
        setErrorMsg(data.error || "Invalid OTP");
        setTimeout(() => {
          setState("idle");
          setDigits(["", "", "", "", "", ""]);
          setLoading(false);
          setTimeout(() => inputRefs.current[0]?.focus(), 50);
        }, 800);
      }
    } catch {
      setState("error");
      setErrorMsg("Network error. Please try again.");
      setTimeout(() => {
        setState("idle");
        setLoading(false);
      }, 800);
    }
  };

  const handleChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const updated = [...digits];
    updated[index] = value;
    setDigits(updated);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (value && index === 5) {
      const otp = updated.join("");
      if (otp.length === 6) verify(otp);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      e.preventDefault();
      const arr = pasted.split("");
      setDigits(arr);
      inputRefs.current[5]?.focus();
      verify(pasted);
    }
  };

  return (
    <div className="flex flex-col flex-1 lg:w-1/2 w-full">
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        <div>
          <div className="mb-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-brand-50 dark:bg-brand-900/20 mb-4">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L4 5v6c0 5.5 3.8 10.7 8 12 4.2-1.3 8-6.5 8-12V5l-8-3z" className="fill-brand-500" />
              </svg>
            </div>
            <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
              Two-Factor Authentication
            </h1>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Enter the 6-digit code from your Google Authenticator app
            </p>
          </div>

          <div className="flex justify-center gap-3 mb-6" onPaste={handlePaste}>
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
                disabled={loading && state !== "idle"}
                className={`w-12 h-14 text-center text-2xl font-bold rounded-xl border-2
                  bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                  outline-none transition-all duration-300
                  focus:ring-2 ${borderColor()}
                  disabled:opacity-60`}
              />
            ))}
          </div>

          {errorMsg && (
            <p className="text-center text-sm text-red-600 dark:text-red-400 mb-4">
              {errorMsg}
            </p>
          )}

          {state === "success" && (
            <p className="text-center text-sm text-green-600 dark:text-green-400 mb-4 font-medium">
              ✓ Verified! Redirecting...
            </p>
          )}

          <p className="text-center text-xs text-gray-400 dark:text-gray-600 mt-4">
            Code expires in 30 seconds. Open Google Authenticator if needed.
          </p>

          <button
            type="button"
            onClick={() => router.push("/signin")}
            className="mt-6 w-full text-sm text-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            ← Back to login
          </button>
        </div>
      </div>
    </div>
  );
}
