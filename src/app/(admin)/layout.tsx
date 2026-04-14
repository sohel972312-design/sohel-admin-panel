"use client";

import { useSidebar } from "@/context/SidebarContext";
import AppHeader from "@/layout/AppHeader";
import AppSidebar from "@/layout/AppSidebar";
import Backdrop from "@/layout/Backdrop";
import React, { useEffect, useRef, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";

const IDLE_TIMEOUT_MS = 30 * 60 * 1000;   // 30 minutes no activity → logout
const RENEW_INTERVAL_MS = 5 * 60 * 1000;  // renew session every 5 min if active
const ACTIVITY_EVENTS = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();
  const router = useRouter();
  const pathname = usePathname();

  const lastActivityRef = useRef<number>(0);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const renewTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const signOut = useCallback(async (reason?: string) => {
    try {
      await fetch('/api/auth/signout', { method: 'POST' });
    } catch { /* ignore */ }
    const url = reason === 'idle'
      ? '/login?reason=idle'
      : '/login';
    router.replace(url);
  }, [router]);

  const resetIdleTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      signOut('idle');
    }, IDLE_TIMEOUT_MS);
  }, [signOut]);

  useEffect(() => {
    // ── 1. Verify session on every route change ──────────────────────────────
    let cancelled = false;
    fetch('/api/auth/me', { cache: 'no-store' })
      .then(async (res) => {
        if (!cancelled && !res.ok) {
          signOut();
        }
      })
      .catch(() => {
        // Network error — don't kick out (could be brief disconnect)
      });

    return () => { cancelled = true; };
  }, [pathname, signOut]);

  useEffect(() => {
    // ── 2. Idle detection ────────────────────────────────────────────────────
    const onActivity = () => resetIdleTimer();
    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
    resetIdleTimer(); // start the timer immediately

    // ── 3. Sliding-window session renew every 5 min if active ────────────────
    renewTimerRef.current = setInterval(() => {
      const idleMs = Date.now() - lastActivityRef.current;
      if (idleMs < RENEW_INTERVAL_MS) {
        // User was active recently — extend session
        fetch('/api/auth/renew', { method: 'PUT', cache: 'no-store' })
          .then(async (res) => {
            if (res.status === 401) signOut();
          })
          .catch(() => { /* network blip — keep going */ });
      }
    }, RENEW_INTERVAL_MS);

    return () => {
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, onActivity));
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (renewTimerRef.current) clearInterval(renewTimerRef.current);
    };
  }, [resetIdleTimer, signOut]);

  const mainContentMargin = isMobileOpen
    ? "ml-0"
    : isExpanded || isHovered
    ? "lg:ml-[290px]"
    : "lg:ml-[90px]";

  return (
    <div className="min-h-screen xl:flex">
      <AppSidebar />
      <Backdrop />
      <div className={`flex-1 transition-all duration-300 ease-in-out ${mainContentMargin}`}>
        <AppHeader />
        <div className="p-4 mx-auto max-w-(--breakpoint-2xl) md:p-6">{children}</div>
      </div>
    </div>
  );
}
