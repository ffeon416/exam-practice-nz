import { describe, expect, it } from "vitest";
import { inviteMessage, inviteToken, readInviteToken } from "@/lib/inviteLink";
import { costingMarks, publicQuestions, summarise, type Marked } from "@/lib/gradeCheck";
import { next7pm, reminderIcs } from "@/lib/reminder";
import { funnelEventId } from "@/lib/metaFunnel";
import type { Question } from "@/lib/types";

const KEY = "k".repeat(40);
const CHILD = "3f2b7c1e-8a4d-4e5f-9b6a-1c2d3e4f5a6b";

describe("invite link", () => {
  it("round-trips", () => {
    expect(readInviteToken(inviteToken(CHILD, 1, KEY), KEY)).toEqual({ childId: CHILD, version: 1 });
  });
  it("rejects tampering, other keys and junk", () => {
    const t = inviteToken(CHILD, 1, KEY);
    expect(readInviteToken(t.replace(".1.", ".2."), KEY)).toBeNull(); // bumped version without re-signing
    expect(readInviteToken(t.slice(0, -1) + (t.endsWith("A") ? "B" : "A"), KEY)).toBeNull();
    expect(readInviteToken(t, "x".repeat(40))).toBeNull();
    for (const junk of ["", "a.b.c", `${CHILD}.0.sig`, `not-a-uuid.1.${t.split(".")[2]}`]) expect(readInviteToken(junk, KEY)).toBeNull();
  });
  it("a new version is a different link", () => {
    expect(inviteToken(CHILD, 2, KEY)).not.toBe(inviteToken(CHILD, 1, KEY));
  });
  it("uses the agreed message", () => {
    expect(inviteMessage("Mia", "https://studyace.co/join/x")).toBe(
      "Mia, here's your plan for the grades you want. 20 minutes a night, on your phone. Tap to start: https://studyace.co/join/x"
    );
  });
  it("Meta events are one per child", () => {
    expect(funnelEventId("InviteSent", CHILD)).toBe(`invite_${CHILD}`);
    expect(funnelEventId("GradeCheckCompleted", CHILD)).toBe(`gradecheck_${CHILD}`);
  });
});

const r = (id: string, awarded: number, max: number, topics: string[], feedback = "Feedback.", unmarked = false): Marked => ({
  questionId: id, marksAwarded: awarded, maxMarks: max, grade: "achieved", feedback, correctApproach: "", examTip: "", topicsToReview: topics, ...(unmarked ? { unmarked } : {}),
});

describe("grade check", () => {
  it("never sends marking guides or expected answers to the browser", () => {
    const q = { id: "q1", number: "1", text: "2+2?", marks: 2, gradeLevel: "achieved", topics: ["x"], answerType: "number", expectedAnswer: "4", markingGuide: "4" } as Question;
    const [p] = publicQuestions([q]);
    expect(p).not.toHaveProperty("markingGuide");
    expect(p).not.toHaveProperty("expectedAnswer");
    expect(p).toMatchObject({ id: "q1", text: "2+2?" });
  });

  it("ranks the three things costing the most marks", () => {
    const c = costingMarks([
      r("q1", 0, 2, ["units"], "No unit. An examiner takes the mark. Always write it."),
      r("q2", 1, 2, ["units"]),
      r("q3", 0, 2, ["rearranging-formulae"]),
      r("q4", 1, 2, ["significant_figures"]),
      r("q5", 2, 2, ["perfect"]),
    ], "Chemistry");
    expect(c.map((x) => x.topic)).toEqual(["Units", "Rearranging formulae", "Significant figures"]);
    expect(c[0]).toEqual({ topic: "Units", lost: 3, why: "No unit." });
  });

  it("scores honestly and leaves out questions the marker failed on", () => {
    const s = summarise({
      results: [r("q1", 2, 2, []), r("q2", 0, 2, ["a"]), r("q3", 0, 2, [], "x", true)],
      curriculumId: "nz-ncea", subject: "mathematics", targetBandId: "a",
    });
    expect("tooManyUnmarked" in s).toBe(false);
    if ("tooManyUnmarked" in s) return;
    expect(s.pct).toBe(50); // 2 of 4 scored marks — the unmarked one isn't a zero
    expect(s.targetLabel).toBe("A");
    expect(s.tomorrow.title).toBe("A");
  });

  it("refuses to score when too many questions couldn't be marked", () => {
    const s = summarise({
      results: [r("q1", 2, 2, []), r("q2", 0, 2, [], "", true), r("q3", 0, 2, [], "", true), r("q4", 0, 2, [], "", true)],
      curriculumId: "nz-ncea", subject: "mathematics", targetBandId: "a",
    });
    expect(s).toEqual({ tooManyUnmarked: true });
  });
});

describe("7pm reminder", () => {
  it("is tonight before 6:55pm, tomorrow after", () => {
    const afternoon = new Date(2026, 9, 23, 15, 0);
    expect(next7pm(afternoon).getDate()).toBe(23);
    expect(next7pm(afternoon).getHours()).toBe(19);
    expect(next7pm(new Date(2026, 9, 23, 18, 58)).getDate()).toBe(24);
    expect(next7pm(new Date(2026, 9, 23, 21, 0)).getDate()).toBe(24);
  });
  it("makes a valid calendar file", () => {
    const ics = reminderIcs({ at: new Date(Date.UTC(2026, 9, 23, 6, 0)), url: "https://studyace.co/hello", uid: "x", now: new Date(Date.UTC(2026, 9, 23, 1, 0)) });
    expect(ics).toContain("BEGIN:VCALENDAR\r\n");
    expect(ics).toContain("DTSTART:20261023T060000Z");
    expect(ics).toContain("DTEND:20261023T061500Z");
    expect(ics).toContain("BEGIN:VALARM");
    expect(ics.trim().endsWith("END:VCALENDAR")).toBe(true);
  });
});
