import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// email.ts talks to Supabase (email_log) and Resend; both are faked here.
const log = new Map<string, { sent_at: string | null }>();
vi.mock("@/lib/supabase", () => ({
  getSupabase: () => ({
    from: () => ({
      insert: async (row: { key: string }) => {
        if (log.has(row.key)) return { error: { code: "23505" } };
        log.set(row.key, { sent_at: null });
        return { error: null };
      },
      update: (patch: { sent_at: string }) => ({ eq: async (_c: string, key: string) => { const r = log.get(key); if (r) r.sent_at = patch.sent_at; return { error: null }; } }),
      delete: () => ({ eq: (_c: string, key: string) => ({ is: async () => { if (log.get(key)?.sent_at === null) log.delete(key); return { error: null }; } }) }),
    }),
  }),
  logEvent: async () => {},
}));

import { sendEmail } from "@/lib/email";
import { makeToken, readToken } from "@/lib/emailLinks";
import { dueEmails, dateLabels } from "@/lib/freeWeekLive";
import { autoCancelledEmail, endingSoonEmail, gradeCheckEmail, notStartedEmail, welcomeEmail, type FreeWeekVars } from "@/lib/funnelEmails";
import { DAY } from "@/lib/freeWeekPromise";

const vars: FreeWeekVars = {
  childName: "Mia", trialEnds: "Thursday 30 October", deadline: "Wednesday 29 October, 9:00 pm",
  inviteHref: "https://studyace.co/go?t=x", cancelHref: "https://studyace.co/cancel?t=y", price: "£69 a year",
};

describe("which email when", () => {
  const T0 = 1_800_000_000;
  const base = { trialStart: T0, trialEnd: T0 + 7 * DAY, status: "trialing", inviteOpened: false, gradeCheckDone: false };
  it("welcome straight after checkout", () => {
    expect(dueEmails({ ...base, now: T0 + 60 })).toEqual(["welcome"]);
  });
  it("day 2: 'hasn't started' only if the invite wasn't opened", () => {
    expect(dueEmails({ ...base, now: T0 + DAY })).toContain("not_started");
    expect(dueEmails({ ...base, now: T0 + DAY, inviteOpened: true })).not.toContain("not_started");
    expect(dueEmails({ ...base, now: T0 + DAY - 60 })).not.toContain("not_started");
  });
  it("grade check result as soon as it's done", () => {
    expect(dueEmails({ ...base, now: T0 + 3600, gradeCheckDone: true })).toContain("gradecheck");
    expect(dueEmails({ ...base, now: T0 + 8 * DAY, status: "active", gradeCheckDone: true })).toEqual(["gradecheck"]);
  });
  it("day 5: 'your free week ends'", () => {
    expect(dueEmails({ ...base, now: T0 + 4 * DAY })).toContain("ending_soon");
    expect(dueEmails({ ...base, now: T0 + 4 * DAY - 60 })).not.toContain("ending_soon");
  });
  it("nothing for a cancelled free week", () => {
    expect(dueEmails({ ...base, now: T0 + 5 * DAY, status: "canceled" })).toEqual([]);
  });
});

describe("templates", () => {
  it("say what was agreed", () => {
    expect(notStartedEmail(vars).subject).toBe("Mia hasn't started yet");
    expect(gradeCheckEmail(vars, {
      subject: "chemistry", subjectLabel: "Chemistry", curriculumId: "uk-gcse", pct: 54, bandId: "c", bandLabel: "C", targetBandId: "a", targetLabel: "A",
      costing: [{ topic: "Units", lost: 3, why: "No unit." }], tomorrow: { title: "Units", detail: "A 20-minute task." }, completedAt: "",
    }).subject).toBe("Here's where Mia actually stands");
    const end = endingSoonEmail(vars, true);
    expect(end.subject).toBe("Your free week ends Thursday 30 October");
    expect(end.text).toContain("Staying? Nothing to do.");
    expect(end.text).toContain("Not for you? Cancel in one click.");
    expect(end.text).toContain("https://studyace.co/cancel?t=y");
  });
  it("day 5 repeats the promise if the check isn't done", () => {
    expect(endingSoonEmail(vars, false).text).toContain("we cancel for you and nothing is charged");
    expect(endingSoonEmail(vars, true).text).not.toContain("we cancel for you");
  });
  it("welcome carries the invite link and the promise", () => {
    const e = welcomeEmail(vars);
    expect(e.html).toContain("https://studyace.co/go?t=x");
    expect(e.text).toContain("nothing is charged");
  });
  it("auto-cancel email says nothing was charged, or that it was refunded", () => {
    expect(autoCancelledEmail(vars, "cron").text).toContain("Nothing has been charged");
    expect(autoCancelledEmail(vars, "refund").text).toContain("refunded it in full");
  });
  it("escapes the child's name in HTML", () => {
    expect(welcomeEmail({ ...vars, childName: "<b>Mia</b>" }).html).not.toContain("<b>Mia</b>");
  });
  it("never says teen or track", () => {
    const all = [welcomeEmail(vars), notStartedEmail(vars), endingSoonEmail(vars, false), autoCancelledEmail(vars, "cron")].map((e) => e.text).join(" ");
    expect(all).not.toMatch(/\bteen|\btrack/i);
  });
  it("formats dates for the parent's country", () => {
    const end = Date.UTC(2026, 9, 30, 9, 0) / 1000;
    expect(dateLabels(end, "Europe/London", "GB").trialEnds).toBe("Friday 30 October");
    expect(dateLabels(end, "America/New_York", "US").trialEnds).toBe("Friday, October 30");
  });
});

describe("signed email links", () => {
  const SECRET = "s".repeat(40);
  it("round-trip and expire", () => {
    const now = 1_800_000_000_000;
    const t = makeToken("cancel", ["sub_1", "user_1"], 30, { secret: SECRET, now });
    expect(readToken("cancel", t, { secret: SECRET, now })).toEqual(["sub_1", "user_1"]);
    expect(readToken("cancel", t, { secret: SECRET, now: now + 31 * 86400_000 })).toBeNull();
  });
  it("a sign-in link can't be used as a cancel link (or vice versa)", () => {
    const t = makeToken("go", ["user_1", "/invite"], 7, { secret: SECRET });
    expect(readToken("cancel", t, { secret: SECRET })).toBeNull();
  });
  it("tampering is rejected", () => {
    const t = makeToken("cancel", ["sub_1", "user_1"], 30, { secret: SECRET });
    const [body, sig] = t.split(".");
    const forged = Buffer.from(Buffer.from(body, "base64url").toString().replace("sub_1", "sub_2")).toString("base64url");
    expect(readToken("cancel", `${forged}.${sig}`, { secret: SECRET })).toBeNull();
    expect(readToken("cancel", t, { secret: "o".repeat(40) })).toBeNull();
  });
});

describe("each email goes once", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    log.clear();
    process.env.RESEND_API_KEY = "re_test";
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());
  const e = { to: "p@x.com", subject: "s", html: "h", text: "t", key: "welcome:child1", template: "free_week_welcome" };

  it("a retry or an overlapping run doesn't send it twice", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ id: "em_1" }), { status: 200 }));
    expect(await sendEmail(e)).toBe("sent");
    expect(await sendEmail(e)).toBe("duplicate");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][1].headers["Idempotency-Key"]).toBe("welcome:child1");
  });

  it("a failed send is retried next time", async () => {
    fetchMock.mockResolvedValueOnce(new Response("boom", { status: 500 }));
    expect(await sendEmail(e)).toBe("failed");
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ id: "em_2" }), { status: 200 }));
    expect(await sendEmail(e)).toBe("sent");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe("day-5 'keep the plan going'", () => {
  const withKeep = { ...vars, keepHref: "https://studyace.co/keep?t=z" };
  it("is offered only when the child hasn't done the check", () => {
    expect(endingSoonEmail(withKeep, false).html).toContain("https://studyace.co/keep?t=z");
    expect(endingSoonEmail(withKeep, false).text).toContain("Keep the plan going: https://studyace.co/keep?t=z");
    expect(endingSoonEmail(withKeep, false).text).toContain("hasn't started yet");
    expect(endingSoonEmail(withKeep, true).html).not.toContain("keep?t=");
  });
  it("cancelling says the child keeps access to the end of the free week", () => {
    expect(endingSoonEmail(withKeep, true).text).toContain("keeps access to the end of the free week");
  });
  it("a keep link can't be used as a cancel link", () => {
    const SECRET = "s".repeat(40);
    const t = makeToken("keep", ["sub_1", "user_1"], 7, { secret: SECRET });
    expect(readToken("cancel", t, { secret: SECRET })).toBeNull();
    expect(readToken("keep", t, { secret: SECRET })).toEqual(["sub_1", "user_1"]);
  });
});
