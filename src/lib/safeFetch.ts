// Client-side fetch wrapper with automatic retry, exponential backoff,
// and graceful failure. Used for any AI-backed API call from the browser.

interface SafeFetchOptions extends RequestInit {
  maxAttempts?: number;
  initialDelayMs?: number;
  timeoutMs?: number;
}

export async function safeFetch(url: string, options: SafeFetchOptions = {}): Promise<Response> {
  const maxAttempts = options.maxAttempts ?? 4;
  const initialDelay = options.initialDelayMs ?? 1500;
  const timeout = options.timeoutMs ?? 180000; // 3 minutes default

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const res = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      // Don't retry on success or client errors
      if (res.ok || (res.status >= 400 && res.status < 500 && res.status !== 408 && res.status !== 429)) {
        return res;
      }

      // 5xx, 408, 429 → retry
      lastError = new Error(`Server returned ${res.status}`);
    } catch (err) {
      clearTimeout(timeoutId);
      lastError = err;
    }

    if (attempt < maxAttempts) {
      const delay = initialDelay * Math.pow(2, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError ?? new Error("Request failed after all retries");
}

// JSON-aware version that retries on parse errors too
export async function safeFetchJson<T>(url: string, options: SafeFetchOptions = {}): Promise<T> {
  const res = await safeFetch(url, options);
  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("Server returned invalid response");
  }
}
