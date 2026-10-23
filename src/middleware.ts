import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { COUNTRY_COOKIE } from "@/lib/metaShared";

const isPublicRoute = createRouteMatcher([
  "/",
  "/pricing(.*)",
  "/sign-in(.*)",
  "/start(.*)",
  "/redeem(.*)",
  "/schools(.*)",
  "/contact(.*)",
  "/privacy(.*)",
  "/terms(.*)",
  "/blog(.*)",
  "/global(.*)",
  "/grade(.*)",
  "/on-track(.*)",
  "/invite(.*)",
  "/join(.*)",
  "/go(.*)",
  "/cancel(.*)",
  "/opengraph-image(.*)",
  "/twitter-image(.*)",
  "/icon(.*)",
  "/apple-icon(.*)",
  "/robots.txt",
  "/sitemap.xml",
  "/feed.xml",
  "/b94aba48f91b37ad3cc0550391059fa4.txt", // IndexNow ownership key
  "/api/school-enquiry",
  "/api/contact",
  "/api/checkout(.*)",
  "/api/track",
  "/api/meta",
  "/api/rec",
  "/api/waitlist",
  "/api/diagnostic(.*)",
  "/api/on-track(.*)",
  "/api/funnel(.*)",
  "/api/join",
  "/api/go",
  "/api/cancel",
  "/api/stripe-webhook",
  "/api/cron(.*)",

]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.redirect(new URL("/sign-in", req.url));
    }
  }
  // Visitor country for the browser (consent banner, local prices), from
  // Vercel's geo header. Only written when it changes.
  const country = req.headers.get("x-vercel-ip-country");
  if (country && req.cookies.get(COUNTRY_COOKIE)?.value !== country) {
    const res = NextResponse.next();
    res.cookies.set(COUNTRY_COOKIE, country, { path: "/", maxAge: 60 * 60 * 24 * 30, sameSite: "lax", secure: true });
    return res;
  }
});

export const config = {
  matcher: [
    // Skip Next internals and static files
    // NB: media extensions must be listed here or Clerk redirects them to
    // /sign-in for signed-out visitors — a static asset would 307 instead of
    // loading (this bit the hero clip: mp4/webm were missing from the list).
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|avif|png|gif|svg|mp4|webm|m4v|mov|ogv|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
