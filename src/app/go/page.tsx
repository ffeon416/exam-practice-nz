"use client";

// /go?t=… — sign-in link from a parent email (no password).

import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSignIn, useUser } from "@clerk/nextjs";

function GoInner() {
  const params = useSearchParams();
  const router = useRouter();
  const { isLoaded } = useUser();
  const { signIn } = useSignIn();
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (!isLoaded || !signIn || started.current) return;
    started.current = true;
    (async () => {
      const t = params.get("t") ?? "";
      const res = await fetch("/api/go", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ t }) }).catch(() => null);
      const data = (await res?.json().catch(() => ({}))) as { ticket?: string; to?: string; signedIn?: boolean; signedInAsOther?: boolean; error?: string } | undefined;
      if (!data || data.error) { setError(data?.error ?? "No connection. Try the link again."); return; }
      const to = data.to ?? "/invite";
      if (data.signedIn) { router.replace(to); return; }
      if (data.signedInAsOther) { setError("This browser is signed in to a different StudyAce account. Sign out from your profile, then open the link again."); return; }
      const { error: e1 } = await signIn.ticket({ ticket: data.ticket! });
      const fin = e1 ? { error: e1 } : await signIn.finalize();
      if (fin.error) { setError("We couldn't sign you in. Sign in with your email instead."); return; }
      router.replace(to);
    })();
  }, [isLoaded, signIn, params, router]);

  return (
    <div className="min-h-[calc(100vh-3rem)] bg-white px-4 py-16 text-[#15151B]">
      <div className="mx-auto max-w-[480px]">
        {error ? (
          <>
            <h1 className="text-[26px] font-bold leading-tight">That link didn&rsquo;t work</h1>
            <p className="mt-3 text-[16px] text-[#4D4F58]">{error}</p>
            <Link href="/sign-in?redirect_url=%2Finvite" className="mt-6 inline-flex min-h-[44px] items-center justify-center rounded-[10px] bg-[#5B47E0] px-5 text-[16px] font-semibold text-white hover:bg-[#4A3AC4]">Sign in</Link>
          </>
        ) : (
          <div className="py-16 text-center" role="status">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-[#ECECF0] border-t-[#5B47E0]" aria-hidden />
            <p className="text-[16px] font-semibold">Signing you in…</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function GoPage() {
  return <Suspense fallback={<div className="min-h-[70vh] bg-white" aria-hidden />}><GoInner /></Suspense>;
}
