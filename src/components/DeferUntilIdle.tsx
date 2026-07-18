"use client";

import { useEffect, useState, type ReactNode } from "react";

/**
 * Mounts its children only once the browser has gone idle after first paint.
 *
 * Used to keep heavy, non-essential scripts (analytics, session replay) off the
 * critical path: they must not download/parse/run while the page is still
 * hydrating, or they delay the moment the UI can accept a click. Analytics
 * firing a second or two late costs nothing; a page that can't be tapped does.
 */
export default function DeferUntilIdle({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const idle = window.requestIdleCallback;
    if (idle) {
      const id = idle(() => setReady(true), { timeout: 4000 });
      return () => window.cancelIdleCallback?.(id);
    }
    const t = setTimeout(() => setReady(true), 2000);
    return () => clearTimeout(t);
  }, []);

  return ready ? <>{children}</> : null;
}
