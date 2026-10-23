"use client";

// /join/<token> — the kid taps the invite link their parent sent.
// Signs them into their own account (no password) and hands over to /hello.
// If the parent taps it themselves (common: checking it works), we say whose
// link it is rather than quietly signing the parent out.

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useClerk, useSignIn, useUser } from "@clerk/nextjs";

type Reply = { ticket?: string; firstName?: string; signedIn?: boolean; isParent?: boolean; signedInAsOther?: boolean; error?: string };
type View =
  | { kind: "loading" }
  | { kind: "wrong-person"; firstName: string; parent: boolean }
  | { kind: "error"; message: string };

export default function JoinPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const { isLoaded } = useUser();
  const { signIn } = useSignIn();
  const { signOut } = useClerk();
  const [view, setView] = useState<View>({ kind: "loading" });
  const started = useRef(false);

  useEffect(() => {
    if (!isLoaded || !signIn || started.current) return;
    started.current = true;
    (async () => {
      let data: Reply = {};
      try {
        const res = await fetch("/api/join", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) });
        data = (await res.json().catch(() => ({}))) as Reply;
      } catch {
        setView({ kind: "error", message: "No connection. Check your internet and tap the link again." });
        return;
      }
      if (data.error) { setView({ kind: "error", message: data.error }); return; }
      if (data.signedIn) { router.replace("/hello"); return; }
      if (data.isParent || data.signedInAsOther) {
        setView({ kind: "wrong-person", firstName: data.firstName ?? "your child", parent: !!data.isParent });
        return;
      }
      if (!data.ticket) { setView({ kind: "error", message: "We couldn't sign you in. Tap the link again." }); return; }
      const { error } = await signIn.ticket({ ticket: data.ticket });
      const fin = error ? { error } : await signIn.finalize();
      if (fin.error) { setView({ kind: "error", message: "We couldn't sign you in. Tap the link again." }); return; }
      router.replace("/hello");
    })();
  }, [isLoaded, signIn, token, router]);

  return (
    <div className="min-h-[calc(100vh-3rem)] bg-white px-4 py-16 text-[#15151B]">
      <div className="mx-auto max-w-[480px]">
        {view.kind === "loading" && (
          <div className="py-16 text-center" role="status">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-[#ECECF0] border-t-[#5B47E0]" aria-hidden />
            <p className="text-[16px] font-semibold">Opening StudyAce…</p>
          </div>
        )}

        {view.kind === "wrong-person" && (
          <>
            <h1 className="text-[26px] font-bold leading-tight">This is {view.firstName}&rsquo;s invite</h1>
            <p className="mt-3 text-[16px] text-[#4D4F58]">
              {view.parent
                ? `It works. Send it to ${view.firstName} and they open it on their own phone.`
                : `This phone is signed in to a different StudyAce account.`}
            </p>
            <button
              type="button"
              onClick={() => void signOut({ redirectUrl: window.location.href })}
              className="mt-6 inline-flex min-h-[44px] w-full items-center justify-center rounded-[10px] border border-[#E2E2E8] bg-white px-4 text-[16px] font-semibold hover:bg-[#F6F6F8]"
            >
              I&rsquo;m {view.firstName}. Sign in as me
            </button>
          </>
        )}

        {view.kind === "error" && (
          <>
            <h1 className="text-[26px] font-bold leading-tight">That didn&rsquo;t work</h1>
            <p className="mt-3 text-[16px] text-[#4D4F58]">{view.message}</p>
          </>
        )}
      </div>
    </div>
  );
}
