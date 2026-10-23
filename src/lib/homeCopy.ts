// Homepage words and figures that change by country (from Vercel's geo
// header). Exam names, the example forecast card, and the "side by side"
// cost figures. Edit freely — the page reads everything from here.
//
// Cost figures are TYPICAL, not quotes, and the page says so: a private tutor
// is one hour a week over a 40-week school year at a common local rate; a
// revision guide budget is a few guides across their subjects.

import { FUNNEL_PRICES, currencyForCountry, funnelPricesForCountry, type FunnelCurrency } from "./funnelPricing";

/** Typical private tutor rate per hour, by the visitor's currency. Edit freely. */
export const TUTOR_HOURLY: Record<FunnelCurrency, number> = { gbp: 40, aud: 65, nzd: 70, usd: 60, cad: 60 };
export const TUTOR_WEEKS = 40;

export function tutorYearLabel(currency: FunnelCurrency): string {
  return `${FUNNEL_PRICES[currency].prefix}${(TUTOR_HOURLY[currency] * TUTOR_WEEKS).toLocaleString("en-GB")}+`;
}

export type HomeCountry = "GB" | "AU" | "NZ" | "US" | "CA" | "XX";

export type HomeCopy = {
  country: HomeCountry;
  /** "GCSE and A-level" — hero eyebrow and product line */
  exams: string;
  /** NCEA is the only system out of early access */
  earlyAccess: boolean;
  /** Green bar on the example card */
  onPaceFor: string;
  /** One hour a week over a school year, at TUTOR_HOURLY */
  tutorYear: string;
  guidesYear: string;
};

const COPY: Record<HomeCountry, Omit<HomeCopy, "country" | "tutorYear">> = {
  GB: { exams: "GCSE and A-level", earlyAccess: true, onPaceFor: "On pace for first-choice offer", guidesYear: "£40–£80" },
  AU: { exams: "HSC, VCE and QCE", earlyAccess: true, onPaceFor: "On pace for first-choice ATAR", guidesYear: "A$60–A$120" },
  NZ: { exams: "NCEA", earlyAccess: false, onPaceFor: "On pace for first-choice university", guidesYear: "NZ$60–NZ$160" },
  US: { exams: "AP and SAT", earlyAccess: true, onPaceFor: "On pace for first-choice college", guidesYear: "US$40–US$100" },
  CA: { exams: "high school", earlyAccess: true, onPaceFor: "On pace for first-choice university", guidesYear: "C$50–C$120" },
  XX: { exams: "high-school exam", earlyAccess: true, onPaceFor: "On pace for first-choice university", guidesYear: "US$40–US$100" },
};

export function homeCountry(cc: string | null | undefined): HomeCountry {
  const c = (cc ?? "").toUpperCase();
  if (c === "UK" || c === "GB" || c === "IM" || c === "JE" || c === "GG") return "GB";
  return (["AU", "NZ", "US", "CA"] as const).find((k) => k === c) ?? "XX";
}

export function homeCopy(cc: string | null | undefined): HomeCopy {
  const country = homeCountry(cc);
  return { country, ...COPY[country], tutorYear: tutorYearLabel(currencyForCountry(cc)) };
}

export function homePrices(cc: string | null | undefined) {
  return funnelPricesForCountry(cc);
}

/** The example card ("Where Mia stands"): illustrative, labelled as an example. */
export const EXAMPLE_CHILD = "Mia";
export const EXAMPLE_SUBJECTS: { name: string; now: string; heading: string; trend: number[] }[] = [
  { name: "Maths", now: "B", heading: "A", trend: [52, 55, 54, 60, 63, 68] },
  { name: "Chemistry", now: "C", heading: "B", trend: [41, 44, 49, 50, 55, 58] },
  { name: "English", now: "B", heading: "A", trend: [58, 57, 62, 64, 66, 70] },
];
