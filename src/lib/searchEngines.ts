// Notify search engines when content changes.
//
// Google deprecated sitemap pings in 2023 and Bing's ping endpoint now returns
// 410, so the only live push channel is IndexNow (Bing, Yandex, DuckDuckGo,
// Seznam, Naver share the index). Google still relies on the sitemap + GSC.
//
// The key is not a secret: IndexNow verifies ownership by fetching
// https://studyace.co/<key>.txt, which lives in /public.

const SITE_URL = process.env.NEXT_PUBLIC_URL || "https://studyace.co";
export const INDEXNOW_KEY = "b94aba48f91b37ad3cc0550391059fa4";

export interface PingResult {
  success: boolean;
  message: string;
}

export async function submitIndexNow(urls: string[]): Promise<PingResult> {
  const list = Array.from(new Set(urls)).filter((u) => u.startsWith(SITE_URL));
  if (list.length === 0) return { success: true, message: "IndexNow: nothing to submit" };

  try {
    const host = new URL(SITE_URL).host;
    const res = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host,
        key: INDEXNOW_KEY,
        keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
        urlList: list,
      }),
    });
    // 200 = processed, 202 = accepted (key validation pending). Both are fine.
    return res.ok || res.status === 202
      ? { success: true, message: `IndexNow accepted ${list.length} URL(s) (${res.status})` }
      : { success: false, message: `IndexNow failed: ${res.status}` };
  } catch (err) {
    return {
      success: false,
      message: `IndexNow error: ${err instanceof Error ? err.message : "Unknown"}`,
    };
  }
}

/** Submit the blog index, sitemap, and any URLs that changed today. */
export async function pingSearchEngines(changedUrls: string[] = []) {
  const indexnow = await submitIndexNow([
    `${SITE_URL}/blog`,
    `${SITE_URL}/sitemap.xml`,
    ...changedUrls,
  ]);
  return { indexnow };
}
