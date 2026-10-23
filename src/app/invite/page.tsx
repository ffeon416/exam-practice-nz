"use client";

// /invite — where a parent lands straight after the free-week checkout.
//
// Stripe sends them here with ?session_id. We make sure their account and
// their child's profile exist (the webhook may not have run yet), sign them in
// with a one-time ticket (no password), then strip the session id from the
// URL. Phase 3 builds the "Send [name] their invite" composer on this page.

import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSignIn, useUser } from "@clerk/nextjs";

type Child = { id: string; firstName: string };
type SessionReply = {
  childFirstName?: string | null;
  children?: Child[];
  trialEnd?: string | null;
  email?: string;
  signedIn?: boolean;
  signedInAsOther?: boolean;
  ticket?: string | null;
  error?: string;
  retry?: boolean;
};

type View =
  | { kind: "loading"; title: string }
  | { kind: "ready"; childName: string; trialEnd: string | null }
  | { kind: "signin"; email: string | null }
  | { kind: "error"; message: string };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function endsOn(iso: string | null): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });
  } catch {
    return null;
  }
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[calc(100vh-3rem)] bg-white text-[#15151B] px-4 py-12">
      <div className="mx-auto max-w-[520px]">{children}</div>
    </div>
  );
}

function InviteInner() {
  const params = useSearchParams();
  const sessionId = params.get("session_id");
  const { isLoaded, isSignedIn } = useUser();
  const { signIn } = useSignIn();
  const [view, setView] = useState<View>({ kind: "loading", title: "Starting your free week…" });
  const started = useRef(false);

  useEffect(() => {
    if (!isLoaded || started.current) return;
    started.current = true;

    (async () => {
      // Coming back later, signed in, without a session id.
      if (!sessionId) {
        if (!isSignedIn) { setView({ kind: "signin", email: null }); return; }
        const res = await fetch("/api/funnel/session", { cache: "no-store" });
        const data = (await res.json().catch(() => ({}))) as SessionReply;
        const first = data.children?.[0];
        if (first) setView({ kind: "ready", childName: first.firstName, trialEnd: null });
        else setView({ kind: "error", message: "We couldn't find a child on this account." });
        return;
      }

      // Straight from Stripe: the webhook may still be running, so retry a few times.
      let data: SessionReply = {};
      for (let attempt = 0; attempt < 8; attempt++) {
        try {
          const res = await fetch(`/api/funnel/session?id=${encodeURIComponent(sessionId)}`, { cache: "no-store" });
          data = (await res.json().catch(() => ({}))) as SessionReply;
          if (res.ok || !data.retry) break;
        } catch {
          data = { error: "No connection.", retry: true };
        }
        await sleep(1500 + attempt * 500);
      }
      if (data.error) { setView({ kind: "error", message: data.error }); return; }

      const childName = data.childFirstName || "your child";
      if (!data.signedIn) {
        if (!data.ticket || !signIn) { setView({ kind: "signin", email: data.email ?? null }); return; }
        if (data.signedInAsOther) {
          setView({ kind: "error", message: "This browser is signed in to a different StudyAce account. Sign out from your profile, then sign in with the email you used at checkout." });
          return;
        }
        setView({ kind: "loading", title: "Signing you in…" });
        const { error: ticketErr } = await signIn.ticket({ ticket: data.ticket });
        const { error: finalErr } = ticketErr ? { error: ticketErr } : await signIn.finalize();
        if (ticketErr || finalErr) { setView({ kind: "signin", email: data.email ?? null }); return; }
      }
      // The session id is proof of purchase: don't leave it in the address bar / history.
      window.history.replaceState({}, "", "/invite");
      setView({ kind: "ready", childName, trialEnd: data.trialEnd ?? null });
    })();
  }, [isLoaded, isSignedIn, sessionId, signIn]);

  if (view.kind === "loading") {
    return (
      <Shell>
        <div className="py-24 text-center" role="status">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-[#ECECF0] border-t-[#5B47E0]" aria-hidden />
          <p className="text-[16px] font-semibold">{view.title}</p>
        </div>
      </Shell>
    );
  }

  if (view.kind === "signin") {
    return (
      <Shell>
        <h1 className="text-[28px] font-bold leading-tight">Your free week has started</h1>
        <p className="mt-3 text-[16px] text-[#4D4F58]">
          Sign in with {view.email ? <strong className="text-[#15151B]">{view.email}</strong> : "the email you used at checkout"}.
          We&rsquo;ll email you a code. No password needed.
        </p>
        <Link href="/sign-in?redirect_url=%2Finvite"
          className="mt-6 inline-flex min-h-[44px] items-center justify-center rounded-[10px] bg-[#5B47E0] px-5 text-[16px] font-semibold text-white hover:bg-[#4A3AC4]">
          Sign in
        </Link>
      </Shell>
    );
  }

  if (view.kind === "error") {
    return (
      <Shell>
        <h1 className="text-[28px] font-bold leading-tight">Something&rsquo;s not right</h1>
        <p className="mt-3 text-[16px] text-[#4D4F58]">{view.message} If you were charged, email us and we&rsquo;ll sort it today.</p>
        <Link href="/contact" className="mt-6 inline-flex min-h-[44px] items-center text-[16px] font-semibold text-[#4A3AC4] underline underline-offset-2">
          Contact us
        </Link>
      </Shell>
    );
  }

  const end = endsOn(view.trialEnd);
  return (
    <Shell>
      <p className="text-[14px] font-semibold text-[#1F8A55]">You&rsquo;re in</p>
      <h1 className="mt-1 text-[28px] font-bold leading-tight">{view.childName}&rsquo;s free week has started</h1>
      <p className="mt-3 text-[16px] text-[#4D4F58]">
        {end ? <>It ends on {end}. </> : null}We&rsquo;ll email you before it does.
      </p>
      {/* PHASE 3: "Send [name] their invite" composer (text, WhatsApp, email, QR) goes here. */}
      <div className="mt-8 rounded-2xl border border-[#E2E2E8] bg-[#F6F6F8] p-5">
        <p className="text-[16px] font-semibold">Next: send {view.childName} their invite</p>
        <p className="mt-1 text-[15px] text-[#62646D]">[Invite composer — built in Phase 3]</p>
      </div>
    </Shell>
  );
}

export default function InvitePage() {
  return (
    <Suspense fallback={<div className="min-h-[70vh] bg-white" aria-hidden />}>
      <InviteInner />
    </Suspense>
  );
}
