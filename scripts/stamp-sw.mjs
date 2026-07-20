// Stamps the current build's commit SHA into public/sw.js so the service
// worker's bytes change on every Vercel deploy. That change is what makes the
// browser install a fresh worker and — via ServiceWorkerRegister's
// controllerchange handler — reload installed home-screen PWAs into the new
// build automatically. Without a per-deploy stamp, a JS-only deploy leaves the
// SW byte-identical, no update is detected, and installed apps keep running
// stale code (exactly the bug this guards against).
//
// Safety: only stamps on Vercel builds (so local `npm run build` never dirties
// the tracked file), and NEVER fails the build — any error is logged and
// swallowed. Runs before `next build` (see package.json) so the stamped file
// is the one copied into the deployment.
import { readFileSync, writeFileSync } from "node:fs";

const swPath = new URL("../public/sw.js", import.meta.url);

try {
  // Local builds keep the "dev" placeholder → no git noise. Only real deploys
  // (Vercel sets VERCEL=1) get a unique version.
  if (!process.env.VERCEL) {
    console.log("[stamp-sw] not a Vercel build — leaving BUILD_VERSION as-is");
    process.exit(0);
  }

  const version =
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.VERCEL_DEPLOYMENT_ID ||
    String(Date.now());

  const src = readFileSync(swPath, "utf8");
  const next = src.replace(
    /const BUILD_VERSION = "[^"]*";/,
    `const BUILD_VERSION = "${version}";`,
  );

  if (next === src) {
    console.warn("[stamp-sw] BUILD_VERSION line not found — SW left unchanged");
  } else {
    writeFileSync(swPath, next);
    console.log(`[stamp-sw] stamped sw.js BUILD_VERSION=${version}`);
  }
} catch (err) {
  // Never block a deploy over the version stamp.
  console.warn("[stamp-sw] skipped:", err?.message ?? err);
}

process.exit(0);
