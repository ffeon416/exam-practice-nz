"use client";

// "Send [name] their invite" — the parent's main job after checkout.
// A ready-made message (editable) with the child's magic link, sent the way
// families actually talk: text, WhatsApp, email, or a QR code to scan off
// the parent's screen. Each send records InviteSent (browser Pixel + server,
// one shared event id, counted once per child).

import { useEffect, useState } from "react";
import { firePixel } from "@/lib/metaPixel";

type Invite = {
  childId: string;
  firstName: string;
  link: string;
  message: string;
  sentAt: string | null;
  openedAt: string | null;
  gradeCheckDone: boolean;
  inviteEventId: string;
};
type Channel = "sms" | "whatsapp" | "email" | "qr" | "copy";

const btn =
  "inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-[10px] px-4 text-[16px] font-semibold transition-colors";
const primary = `${btn} bg-[#5B47E0] text-white hover:bg-[#4A3AC4]`;
const secondary = `${btn} border border-[#E2E2E8] bg-white text-[#15151B] hover:bg-[#F6F6F8]`;

function isIOS() {
  try { return /iPhone|iPad|iPod/.test(navigator.userAgent); } catch { return false; }
}

export default function InviteComposer({ childId }: { childId?: string | null }) {
  const [invite, setInvite] = useState<Invite | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [sent, setSent] = useState<Channel | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    let off = false;
    (async () => {
      try {
        const res = await fetch(`/api/funnel/invite${childId ? `?childId=${encodeURIComponent(childId)}` : ""}`, { cache: "no-store" });
        const data = (await res.json()) as Invite & { error?: string };
        if (off) return;
        if (!res.ok) { setError(data.error ?? "Couldn't load the invite."); return; }
        setInvite(data);
        setMessage(data.message);
      } catch {
        if (!off) setError("No connection. Refresh to try again.");
      }
    })();
    return () => { off = true; };
  }, [childId]);

  if (error) return <p className="text-[15px] text-[#A2381B]" role="alert">{error}</p>;
  if (!invite) return <div className="h-48 animate-pulse rounded-2xl bg-[#F6F6F8]" aria-hidden />;

  const name = invite.firstName;
  // The link must be in whatever they send; put it back if it was edited out.
  const outgoing = message.includes(invite.link) ? message : `${message.trim()} ${invite.link}`;
  const enc = encodeURIComponent(outgoing);
  const smsHref = `sms:${isIOS() ? "&" : "?"}body=${enc}`;
  const waHref = `https://wa.me/?text=${enc}`;
  const mailHref = `mailto:?subject=${encodeURIComponent(`${name}, your StudyAce plan`)}&body=${enc}`;

  function record(channel: Channel) {
    setSent(channel);
    firePixel("InviteSent", invite!.inviteEventId, {}, true);
    void fetch("/api/funnel/invite", {
      method: "POST", headers: { "Content-Type": "application/json" }, keepalive: true,
      body: JSON.stringify({ childId: invite!.childId, action: "sent", channel }),
    }).catch(() => {});
  }

  async function showQr() {
    record("qr");
    if (qr) return;
    const QRCode = (await import("qrcode")).default;
    setQr(await QRCode.toString(invite!.link, { type: "svg", margin: 1, width: 240, color: { dark: "#15151B", light: "#FFFFFF" } }));
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(outgoing);
      setCopied(true);
      record("copy");
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard blocked: the text is right there to select */ }
  }

  async function reset() {
    const res = await fetch("/api/funnel/invite", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ childId: invite!.childId, action: "reset" }),
    });
    const data = (await res.json().catch(() => null)) as Invite | null;
    if (res.ok && data) { setInvite(data); setMessage(data.message); setQr(null); setConfirmReset(false); }
  }

  const status = invite.gradeCheckDone
    ? `${name} has done the grade check. Your summary is on its way by email.`
    : invite.openedAt
      ? `${name} has opened the invite.`
      : sent || invite.sentAt
        ? `Sent. Once ${name} has done the grade check, we'll email you where they stand.`
        : null;

  return (
    <div>
      <label htmlFor="invite-msg" className="block text-[15px] font-semibold">Your message</label>
      <p className="mt-0.5 text-[14px] text-[#62646D]">Change it if you like. The link is what signs {name} in.</p>
      <textarea
        id="invite-msg"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={5}
        className="mt-2 w-full rounded-[10px] border border-[#E2E2E8] bg-white p-3 text-[16px] leading-relaxed text-[#15151B] focus:border-[#5B47E0] focus:outline-none"
      />
      {!message.includes(invite.link) && (
        <p className="mt-1 text-[14px] text-[#62646D]">We&rsquo;ll add the link back on the end when you send.</p>
      )}

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <a href={smsHref} onClick={() => record("sms")} className={primary}>Send by text</a>
        <a href={waHref} target="_blank" rel="noopener noreferrer" onClick={() => record("whatsapp")} className={secondary}>WhatsApp</a>
        <a href={mailHref} onClick={() => record("email")} className={secondary}>Email</a>
        <button type="button" onClick={showQr} className={secondary}>Show a QR code</button>
      </div>

      {qr && (
        <div className="mt-4 rounded-2xl border border-[#E2E2E8] bg-white p-4 text-center">
          <div className="mx-auto w-[240px]" aria-label={`QR code for ${name}'s invite link`} role="img" dangerouslySetInnerHTML={{ __html: qr }} />
          <p className="mt-2 text-[15px] text-[#4D4F58]">{name} points their phone camera at this.</p>
        </div>
      )}

      <button type="button" onClick={copy} className="mt-3 min-h-[44px] text-[15px] font-semibold text-[#4A3AC4] underline underline-offset-2">
        {copied ? "Copied" : "Copy message"}
      </button>

      {status && (
        <p className="mt-4 rounded-[10px] bg-[#EEF8F2] px-3 py-2.5 text-[15px] text-[#1F8A55]" role="status">{status}</p>
      )}

      <div className="mt-6 border-t border-[#ECECF0] pt-4 text-[14px] text-[#62646D]">
        {confirmReset ? (
          <p>
            The old link will stop working.{" "}
            <button type="button" onClick={reset} className="min-h-[44px] font-semibold text-[#A2381B] underline underline-offset-2">Make a new link</button>{" "}
            <button type="button" onClick={() => setConfirmReset(false)} className="min-h-[44px] font-semibold underline underline-offset-2">Keep it</button>
          </p>
        ) : (
          <p>
            Sent it to the wrong person?{" "}
            <button type="button" onClick={() => setConfirmReset(true)} className="min-h-[44px] font-semibold underline underline-offset-2">Make a new link</button>
          </p>
        )}
      </div>
    </div>
  );
}
