import { createSign } from "node:crypto";

// Google Analytics 4 → the admin pages. Reads the GA4 Data API with a
// service account so /admin/pulse can show what Google sees next to our own
// first-party numbers. Server only. Needs three env vars (see .env.example):
//   GA_PROPERTY_ID   the numeric GA4 property id (Admin → Property details)
//   GA_CLIENT_EMAIL  the service account's email, added to the property as Viewer
//   GA_PRIVATE_KEY   the service account's private key (PEM; "\n" escapes are fine)
// Unset → isGaConfigured() is false and the UI shows how to connect it.

const SCOPE = "https://www.googleapis.com/auth/analytics.readonly";
const API = "https://analyticsdata.googleapis.com/v1beta";

export function isGaConfigured(): boolean {
  return !!(process.env.GA_PROPERTY_ID && process.env.GA_CLIENT_EMAIL && process.env.GA_PRIVATE_KEY);
}

let cachedToken: { value: string; exp: number } | null = null;

const b64url = (s: Buffer | string) => Buffer.from(s).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");

async function accessToken(): Promise<string> {
  if (cachedToken && cachedToken.exp > Date.now() + 60_000) return cachedToken.value;
  const email = process.env.GA_CLIENT_EMAIL!;
  const key = process.env.GA_PRIVATE_KEY!.replace(/\\n/g, "\n");
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(JSON.stringify({ iss: email, scope: SCOPE, aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 }));
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${claims}`);
  const jwt = `${header}.${claims}.${b64url(signer.sign(key))}`;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }),
  });
  const data = (await res.json()) as { access_token?: string; expires_in?: number; error?: string; error_description?: string };
  if (!res.ok || !data.access_token) throw new Error(`Google token: ${data.error_description ?? data.error ?? res.status}`);
  cachedToken = { value: data.access_token, exp: Date.now() + (data.expires_in ?? 3600) * 1000 };
  return cachedToken.value;
}

type Row = { dimensionValues?: { value: string }[]; metricValues?: { value: string }[] };
type Report = { rows?: Row[]; rowCount?: number };

async function run(path: string, body: unknown): Promise<Report> {
  const token = await accessToken();
  const res = await fetch(`${API}/properties/${process.env.GA_PROPERTY_ID}:${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8000),
  });
  const data = (await res.json()) as Report & { error?: { message?: string; status?: string } };
  if (!res.ok) throw new Error(`GA ${path}: ${data.error?.message ?? res.status}`);
  return data;
}

const num = (r: Row, i: number) => Number(r.metricValues?.[i]?.value ?? 0);
const dim = (r: Row, i: number) => r.dimensionValues?.[i]?.value ?? "";

export type GaSnapshot = {
  configured: true;
  activeNow: number;
  users7d: number;
  sessions7d: number;
  users24h: number;
  sources7d: { source: string; medium: string; sessions: number; users: number }[];
  countries7d: { country: string; users: number }[];
  pages7d: { path: string; views: number }[];
};

export type GaStatus = GaSnapshot | { configured: false } | { configured: true; error: string };

/** One call for the phone page: live users, 7-day totals, sources, countries, pages. */
export async function gaSnapshot(): Promise<GaStatus> {
  if (!isGaConfigured()) return { configured: false };
  try {
    const week = [{ startDate: "7daysAgo", endDate: "today" }];
    const [live, totals, day, sources, countries, pages] = await Promise.all([
      run("runRealtimeReport", { metrics: [{ name: "activeUsers" }] }),
      run("runReport", { dateRanges: week, metrics: [{ name: "totalUsers" }, { name: "sessions" }] }),
      run("runReport", { dateRanges: [{ startDate: "yesterday", endDate: "today" }], metrics: [{ name: "totalUsers" }] }),
      run("runReport", { dateRanges: week, dimensions: [{ name: "sessionSource" }, { name: "sessionMedium" }], metrics: [{ name: "sessions" }, { name: "totalUsers" }], orderBys: [{ metric: { metricName: "sessions" }, desc: true }], limit: 8 }),
      run("runReport", { dateRanges: week, dimensions: [{ name: "country" }], metrics: [{ name: "totalUsers" }], orderBys: [{ metric: { metricName: "totalUsers" }, desc: true }], limit: 6 }),
      run("runReport", { dateRanges: week, dimensions: [{ name: "pagePath" }], metrics: [{ name: "screenPageViews" }], orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }], limit: 6 }),
    ]);
    const t = totals.rows?.[0];
    return {
      configured: true,
      activeNow: live.rows?.[0] ? num(live.rows[0], 0) : 0,
      users7d: t ? num(t, 0) : 0,
      sessions7d: t ? num(t, 1) : 0,
      users24h: day.rows?.[0] ? num(day.rows[0], 0) : 0,
      sources7d: (sources.rows ?? []).map((r) => ({ source: dim(r, 0), medium: dim(r, 1), sessions: num(r, 0), users: num(r, 1) })),
      countries7d: (countries.rows ?? []).map((r) => ({ country: dim(r, 0), users: num(r, 0) })),
      pages7d: (pages.rows ?? []).map((r) => ({ path: dim(r, 0), views: num(r, 0) })),
    };
  } catch (err) {
    console.error("GA snapshot failed:", err);
    return { configured: true, error: err instanceof Error ? err.message : "Google Analytics didn't answer." };
  }
}
