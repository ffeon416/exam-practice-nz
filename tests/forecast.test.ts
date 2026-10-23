import { describe, expect, it } from "vitest";
import { forecastFor, localClock, snapshotDue } from "@/lib/forecastSnapshots";
import type { ExamAttempt } from "@/lib/types";

const at = (daysAgo: number, pct: number, subject = "chemistry", now = Date.UTC(2026, 9, 23)): ExamAttempt =>
  ({ examId: "x", date: new Date(now - daysAgo * 864e5).toISOString(), answers: {}, results: [], overallGrade: "achieved", totalMarks: pct, maxMarks: 100, mode: "practice", subject }) as ExamAttempt;

describe("nightly forecast", () => {
  const now = Date.UTC(2026, 9, 23);
  it("matches the app's maths: weighted now, weekly trend, heading for at exam date", () => {
    const f = forecastFor([at(21, 50), at(14, 55), at(7, 60), at(0, 65)], "chemistry", "2027-05-15", now)!;
    expect(f.papers).toBe(4);
    expect(f.nowPct).toBe(60); // (50·1+55·2+60·3+65·4)/10
    expect(f.trendPerWeek).toBe(5);
    expect(f.headingForPct).toBe(100); // capped
  });
  it("no exam date → no 'heading for'; no attempts → nothing", () => {
    expect(forecastFor([at(0, 40)], "chemistry", null, now)!.headingForPct).toBeNull();
    expect(forecastFor([at(0, 40, "maths")], "chemistry", null, now)).toBeNull();
  });
  it("runs once per local night, from 2am, catching up later", () => {
    const clock = localClock("Europe/London", new Date(Date.UTC(2026, 9, 23, 1, 30))); // 02:30 BST
    expect(clock).toEqual({ date: "2026-10-23", hour: 2 });
    expect(snapshotDue(null, clock)).toBe(true);
    expect(snapshotDue("2026-10-23", clock)).toBe(false);
    expect(snapshotDue("2026-10-22", { date: "2026-10-23", hour: 1 })).toBe(false);
    expect(snapshotDue("2026-10-22", { date: "2026-10-23", hour: 9 })).toBe(true);
    expect(localClock("Not/AZone", new Date(Date.UTC(2026, 9, 23, 5))).hour).toBe(5);
  });
});
