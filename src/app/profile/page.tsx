"use client";

import { useUser, useAuth, useClerk } from "@clerk/nextjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useCallback, useRef } from "react";
import { useTier, isUnlimited } from "@/hooks/useTier";
import { TIER_LABELS } from "@/lib/tierLimits";

export default function ProfilePage() {
  const { user, isLoaded: userLoaded } = useUser();
  const { signOut } = useClerk();
  const { isSignedIn } = useAuth();
  const router = useRouter();
  const { tier, limits, usage, loading: tierLoading } = useTier();
  const [managingBilling, setManagingBilling] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showPhotoMenu, setShowPhotoMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Detect mobile/tablet via touch support
  const isMobile = typeof navigator !== "undefined" && /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  const handlePhotoUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setShowPhotoMenu(false);
    setUploadingPhoto(true);
    try {
      await user.setProfileImage({ file });
    } catch (err) {
      console.error("Failed to upload photo:", err);
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (cameraInputRef.current) cameraInputRef.current.value = "";
    }
  }, [user]);

  const handleRemovePhoto = useCallback(async () => {
    if (!user) return;
    setShowPhotoMenu(false);
    setUploadingPhoto(true);
    try {
      await user.setProfileImage({ file: null });
    } catch (err) {
      console.error("Failed to remove photo:", err);
    } finally {
      setUploadingPhoto(false);
    }
  }, [user]);

  const handleManageBilling = useCallback(async () => {
    setManagingBilling(true);
    try {
      const res = await fetch("/api/customer-portal", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }
    } catch {
      // fall through
    }
    setManagingBilling(false);
  }, []);

  const handleSignOut = useCallback(async () => {
    await signOut();
    router.push("/");
  }, [signOut, router]);

  if (!userLoaded || !isSignedIn || !user) {
    return (
      <div className="max-w-2xl mx-auto px-5 pt-20 pb-20">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-white/[0.04] rounded w-48" />
          <div className="h-4 bg-white/[0.04] rounded w-64" />
        </div>
      </div>
    );
  }

  const examsLeft = isUnlimited(limits.examsPerWeek)
    ? "Unlimited"
    : `${usage.examsThisWeek} / ${limits.examsPerWeek} used`;

  const tutorLeft = isUnlimited(limits.tutorMessagesPerWeek)
    ? "Unlimited"
    : limits.tutorMessagesPerWeek === 0
    ? "Pro only"
    : `${usage.tutorMessagesThisWeek} / ${limits.tutorMessagesPerWeek} used`;

  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-indigo-500/[0.07] blur-[120px] rounded-full" />
      </div>

      <div className="max-w-2xl mx-auto px-5 pt-6 sm:pt-16 pb-16 sm:pb-20">
        {/* Header */}
        <h1 className="text-[24px] sm:text-[36px] font-extrabold text-white tracking-tight mb-1">
          My account
        </h1>
        <p className="text-zinc-500 text-[14px] mb-6 sm:mb-10">
          Manage your profile, plan, and preferences.
        </p>

        {/* Profile info */}
        <section className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-4 sm:p-6 mb-4">
          <h2 className="text-[13px] text-zinc-500 uppercase tracking-wider font-semibold mb-4">
            Profile
          </h2>
          <div className="flex items-center gap-4 mb-5">
            {/* Hidden file inputs */}
            {/* Photo library — accept="image/*" without capture so mobile shows photo library */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoUpload}
            />
            {/* Camera — capture="user" opens front camera directly on mobile */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="user"
              className="hidden"
              onChange={handlePhotoUpload}
            />

            {/* Avatar */}
            <div className="relative">
              <button
                onClick={() => {
                  if (isMobile) {
                    // Mobile: show menu with library/camera/remove options
                    setShowPhotoMenu(!showPhotoMenu);
                  } else {
                    // Desktop: just open file picker directly
                    fileInputRef.current?.click();
                  }
                }}
                disabled={uploadingPhoto}
                className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-white/[0.1] hover:border-indigo-500/50 transition-colors"
              >
                {user.imageUrl ? (
                  <img src={user.imageUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-indigo-500/20 flex items-center justify-center text-indigo-300 text-[22px] font-bold">
                    {(user.firstName?.[0] || user.emailAddresses?.[0]?.emailAddress?.[0] || "?").toUpperCase()}
                  </div>
                )}
                {/* Overlay */}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  {uploadingPhoto ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                    </svg>
                  )}
                </div>
              </button>

              {/* Desktop: remove photo button (shown on hover when photo exists) */}
              {!isMobile && user.imageUrl && !uploadingPhoto && (
                <button
                  onClick={handleRemovePhoto}
                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-zinc-800 border border-white/[0.1] flex items-center justify-center opacity-0 group-hover:opacity-100 hover:opacity-100 hover:bg-red-500/20 hover:border-red-500/30 transition-all"
                  title="Remove photo"
                >
                  <svg className="w-3 h-3 text-zinc-400 hover:text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}

              {/* Mobile: photo options menu */}
              {isMobile && showPhotoMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowPhotoMenu(false)} />
                  <div className="absolute top-full left-0 mt-2 z-50 w-52 rounded-xl bg-[#16161f] border border-white/[0.1] shadow-2xl overflow-hidden">
                    <button
                      onClick={() => { fileInputRef.current?.click(); setShowPhotoMenu(false); }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left text-[13px] text-zinc-300 hover:bg-white/[0.06] transition-colors"
                    >
                      <svg className="w-4 h-4 text-indigo-400 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                      </svg>
                      Choose from library
                    </button>
                    <button
                      onClick={() => { cameraInputRef.current?.click(); setShowPhotoMenu(false); }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left text-[13px] text-zinc-300 hover:bg-white/[0.06] transition-colors border-t border-white/[0.06]"
                    >
                      <svg className="w-4 h-4 text-indigo-400 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                      </svg>
                      Take a photo
                    </button>
                    {user.imageUrl && (
                      <button
                        onClick={handleRemovePhoto}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left text-[13px] text-red-400 hover:bg-red-500/[0.08] transition-colors border-t border-white/[0.06]"
                      >
                        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                        Remove photo
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>

            <div>
              <p className="text-white font-semibold text-[16px]">
                {user.fullName || user.firstName || "Student"}
              </p>
              <p className="text-zinc-500 text-[13px]">
                {user.emailAddresses?.[0]?.emailAddress}
              </p>
              <p className="text-zinc-600 text-[11px] mt-0.5">
                Joined {user.createdAt ? new Date(user.createdAt).toLocaleDateString("en-NZ", { month: "long", year: "numeric" }) : "recently"}
              </p>
            </div>
          </div>
        </section>

        {/* Plan */}
        <section className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-4 sm:p-6 mb-4">
          <h2 className="text-[13px] text-zinc-500 uppercase tracking-wider font-semibold mb-4">
            Plan
          </h2>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <span
                className={`text-[13px] font-semibold px-3 py-1 rounded-full border ${
                  tier === "pro"
                    ? "text-yellow-400 bg-yellow-500/10 border-yellow-500/30"
                    : tier === "student"
                    ? "text-indigo-400 bg-indigo-500/10 border-indigo-500/30"
                    : "text-zinc-400 bg-white/[0.04] border-white/[0.1]"
                }`}
              >
                {tierLoading ? "..." : TIER_LABELS[tier]}
              </span>
              {tier === "free" && (
                <span className="text-zinc-600 text-[12px]">
                  Limited features
                </span>
              )}
            </div>
            {tier === "free" ? (
              <Link
                href="/pricing"
                className="text-[13px] font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                Upgrade &rarr;
              </Link>
            ) : (
              <button
                onClick={handleManageBilling}
                disabled={managingBilling}
                className="text-[13px] font-medium text-indigo-400 hover:text-indigo-300 transition-colors disabled:opacity-50"
              >
                {managingBilling ? "Opening..." : "Manage billing"}
              </button>
            )}
          </div>

          {/* Usage this period */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4">
              <p className="text-zinc-500 text-[11px] uppercase tracking-wider font-medium mb-1">
                Exams this week
              </p>
              <p className="text-white font-semibold text-[18px]">{examsLeft}</p>
            </div>
            <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4">
              <p className="text-zinc-500 text-[11px] uppercase tracking-wider font-medium mb-1">
                Tutor chats this week
              </p>
              <p className="text-white font-semibold text-[18px]">{tutorLeft}</p>
            </div>
          </div>
        </section>

        {/* What's included */}
        <section className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-4 sm:p-6 mb-4">
          <h2 className="text-[13px] text-zinc-500 uppercase tracking-wider font-semibold mb-4">
            What&apos;s included
          </h2>
          <div className="space-y-2.5">
            <FeatureRow label="Max questions per exam" value={String(limits.maxQuestions)} />
            <FeatureRow label="All 19 subjects" included={limits.allSubjects} />
            <FeatureRow label="Spaced repetition" included={limits.spacedRepetition} />
            <FeatureRow label="Adaptive difficulty" included={limits.adaptiveDifficulty} />
            <FeatureRow label="Study planner" included={limits.studyPlanner} />
            <FeatureRow label="Deep essay marking" included={limits.deepEssayMarking} />
            <FeatureRow label="Mock exam mode" included={limits.mockExamMode} />
          </div>
          {tier !== "pro" && (
            <Link
              href="/pricing"
              className="mt-5 block text-center text-[13px] font-medium text-indigo-400 hover:text-indigo-300 py-2.5 rounded-lg bg-indigo-500/[0.08] hover:bg-indigo-500/[0.12] transition-colors"
            >
              See all plans &rarr;
            </Link>
          )}
        </section>

        {/* Quick links */}
        <section className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-4 sm:p-6 mb-4">
          <h2 className="text-[13px] text-zinc-500 uppercase tracking-wider font-semibold mb-4">
            Quick links
          </h2>
          <div className="grid grid-cols-2 gap-2">
            <QuickLink href="/dashboard" label="Dashboard" />
            <QuickLink href="/subjects" label="New exam" />
            <QuickLink href="/review" label="Review" />
            <QuickLink href="/refer" label="Invite friends" />
            <QuickLink href="/contact" label="Contact us" />
          </div>
        </section>

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          className="w-full mt-2 py-3 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-zinc-400 hover:text-red-400 hover:border-red-500/20 hover:bg-red-500/[0.04] text-[14px] font-medium transition-all min-h-[48px]"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}

function FeatureRow({ label, included, value }: { label: string; included?: boolean; value?: string }) {
  if (value !== undefined) {
    return (
      <div className="flex items-center justify-between">
        <span className="text-zinc-400 text-[13px]">{label}</span>
        <span className="text-white text-[13px] font-medium">{value}</span>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-between">
      <span className="text-zinc-400 text-[13px]">{label}</span>
      {included ? (
        <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      ) : (
        <svg className="w-4 h-4 text-zinc-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      )}
    </div>
  );
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-zinc-300 text-[13px] font-medium hover:bg-white/[0.06] hover:border-white/[0.12] transition-all"
    >
      {label}
      <svg className="w-3.5 h-3.5 text-zinc-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
      </svg>
    </Link>
  );
}
