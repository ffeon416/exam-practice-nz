// The parent emails for the free week. Pure templates: data in, { subject,
// html, text } out. Calm and plain, the homepage palette, "your child" /
// "they". Sent by lib/freeWeekLive.ts.

import type { GradeCheckSummary } from "./children";

type Out = { subject: string; html: string; text: string };

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function layout(paragraphs: string[], button?: { label: string; href: string }, footer?: string): string {
  const p = paragraphs.map((x) => `<p style="margin:0 0 16px;font-size:16px;line-height:1.55;color:#15151B">${x}</p>`).join("");
  const b = button
    ? `<p style="margin:24px 0"><a href="${esc(button.href)}" style="display:inline-block;background:#5B47E0;color:#ffffff;text-decoration:none;font-weight:600;font-size:16px;padding:13px 22px;border-radius:10px">${esc(button.label)}</a></p>`
    : "";
  const f = `<p style="margin:32px 0 0;font-size:13px;line-height:1.5;color:#62646D">${footer ?? "StudyAce: exam practice, marked like the real thing."}</p>`;
  return `<!doctype html><html><body style="margin:0;background:#ffffff"><div style="max-width:520px;margin:0 auto;padding:28px 20px;font-family:Figtree,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">${p}${b}${f}</div></body></html>`;
}

const strip = (html: string) => html.replace(/<br\s*\/?>/g, "\n").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&rsquo;/g, "'");

function text(paragraphs: string[], button?: { label: string; href: string }): string {
  return [...paragraphs.map(strip), ...(button ? [`${button.label}: ${button.href}`] : [])].join("\n\n");
}

export type FreeWeekVars = {
  childName: string;
  /** "Thursday 30 October" */
  trialEnds: string;
  /** "Wednesday 29 October, 9pm" — the auto-cancel cut-off */
  deadline: string;
  /** Signed sign-in link to /invite */
  inviteHref: string;
  /** Signed one-click cancel link */
  cancelHref: string;
  /** "£69 a year" */
  price: string;
};

export function welcomeEmail(v: FreeWeekVars): Out {
  const n = esc(v.childName);
  const paras = [
    `${n}&rsquo;s free week has started. It ends on ${esc(v.trialEnds)}.`,
    `One thing to do now: send ${n} their invite. It opens StudyAce on their phone, signed in to their own account. No password.`,
    `${n} starts with an 8-question grade check, about 15 minutes. When it&rsquo;s done, we&rsquo;ll email you where they actually stand.`,
    `Nothing to pay this week. If ${n} hasn&rsquo;t done the grade check by ${esc(v.deadline)}, we cancel the free week for you and nothing is charged.`,
  ];
  const button = { label: `Send ${v.childName} their invite`, href: v.inviteHref };
  return { subject: `Welcome to StudyAce. Next: send ${v.childName} their invite`, html: layout(paras, button), text: text(paras, button) };
}

export function notStartedEmail(v: FreeWeekVars): Out {
  const n = esc(v.childName);
  const paras = [
    `${n} hasn&rsquo;t opened their invite yet.`,
    `It&rsquo;s one tap on their phone, then an 8-question grade check of about 15 minutes. Send it again by text or WhatsApp. A message from you gets opened.`,
    `Your free week ends on ${esc(v.trialEnds)}. If ${n} hasn&rsquo;t done the grade check by ${esc(v.deadline)}, we cancel it for you and nothing is charged.`,
  ];
  const button = { label: `Resend ${v.childName}'s invite`, href: v.inviteHref };
  return { subject: `${v.childName} hasn't started yet`, html: layout(paras, button), text: text(paras, button) };
}

export function gradeCheckEmail(v: FreeWeekVars, s: GradeCheckSummary): Out {
  const n = esc(v.childName);
  const costing = s.costing.length
    ? `<strong>What&rsquo;s costing ${n} marks:</strong><br>` +
      s.costing.map((c, i) => `${i + 1}. ${esc(c.topic)} (${c.lost} mark${c.lost === 1 ? "" : "s"} lost)${c.why ? `. ${esc(c.why)}` : ""}`).join("<br>")
    : `${n} didn&rsquo;t drop marks on any one topic. The plan keeps pushing up a level.`;
  const paras = [
    `${n} has done their ${esc(s.subjectLabel)} grade check.`,
    `<strong>Now: ${esc(s.bandLabel)}</strong> (${s.pct}% of the marks). <strong>Target: ${esc(s.targetLabel)}.</strong>`,
    costing,
    `<strong>The plan:</strong> one task a night, about 20 minutes, each one aimed at what&rsquo;s costing marks. Tomorrow: ${esc(s.tomorrow.title)}. ${esc(s.tomorrow.detail)}`,
    `Marked like the real exam: a mark for the working, a mark for the answer. No rounding up.`,
  ];
  const button = { label: "See it in StudyAce", href: v.inviteHref };
  return { subject: `Here's where ${v.childName} actually stands`, html: layout(paras, button), text: text(paras, button) };
}

export function endingSoonEmail(v: FreeWeekVars, gradeCheckDone: boolean): Out {
  const n = esc(v.childName);
  const paras = [
    `Your free week ends on ${esc(v.trialEnds)}.`,
    `<strong>Staying?</strong> Nothing to do. ${n} keeps going, and your plan starts on ${esc(v.trialEnds)} at ${esc(v.price)}.`,
    `<strong>Not for you?</strong> Cancel in one click. Nothing is charged if you cancel before then.`,
    ...(gradeCheckDone ? [] : [`${n} hasn&rsquo;t done the grade check yet. If they haven&rsquo;t by ${esc(v.deadline)}, we cancel for you and nothing is charged.`]),
  ];
  const button = { label: "Cancel in one click", href: v.cancelHref };
  return { subject: `Your free week ends ${v.trialEnds}`, html: layout(paras, button), text: text(paras, button) };
}

export function autoCancelledEmail(v: Pick<FreeWeekVars, "childName">, how: "cron" | "invoice-guard" | "refund"): Out {
  const n = esc(v.childName);
  const paras = [
    `${n} didn&rsquo;t get to the grade check, so as promised we&rsquo;ve cancelled the free week.`,
    how === "refund"
      ? `A payment went through when it shouldn&rsquo;t have. We&rsquo;ve refunded it in full; it can take 5 to 10 days to show on your statement. Nothing more will be charged.`
      : `Nothing has been charged, and nothing will be.`,
    `If ${n} wants to give it a go later, you can start a plan any time at studyace.co.`,
  ];
  return { subject: `We've cancelled ${v.childName}'s free week`, html: layout(paras), text: text(paras) };
}

/** Confirmation after the parent cancels (from the email link or the page). */
export function parentCancelledEmail(v: Pick<FreeWeekVars, "childName"> & { duringTrial: boolean; accessUntil: string | null }): Out {
  const n = esc(v.childName);
  const paras = v.duringTrial
    ? [`You&rsquo;ve cancelled ${n}&rsquo;s free week. Nothing has been charged, and nothing will be.`]
    : [`You&rsquo;ve cancelled ${n}&rsquo;s plan. It won&rsquo;t renew${v.accessUntil ? `, and ${n} keeps access until ${esc(v.accessUntil)}` : ""}.`,
       `Within 30 days of your first payment? Reply to this email for a full refund.`];
  paras.push(`Changed your mind? You can start again any time at studyace.co.`);
  return { subject: v.duringTrial ? `${v.childName}'s free week is cancelled` : `${v.childName}'s plan is cancelled`, html: layout(paras), text: text(paras) };
}
