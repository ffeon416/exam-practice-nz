// Notify search engines when content changes. Bing still honours the sitemap
// ping; Google deprecated theirs in 2023 — rely on the sitemap + GSC URL
// Inspection for Google.

const SITE_URL = process.env.NEXT_PUBLIC_URL || "https://studyace.co";

export async function pingBing(): Promise<{ success: boolean; message: string }> {
  try {
    const url = `https://www.bing.com/ping?sitemap=${encodeURIComponent(`${SITE_URL}/sitemap.xml`)}`;
    const res = await fetch(url, { method: "GET" });
    return res.ok
      ? { success: true, message: "Bing sitemap ping successful" }
      : { success: false, message: `Bing ping failed: ${res.status}` };
  } catch (err) {
    return {
      success: false,
      message: `Bing ping error: ${err instanceof Error ? err.message : "Unknown"}`,
    };
  }
}

export async function pingSearchEngines() {
  const bing = await pingBing();
  return { bing };
}
