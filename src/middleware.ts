import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/pricing(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/demo(.*)",
  "/redeem(.*)",
  "/schools(.*)",
  "/contact(.*)",
  "/privacy(.*)",
  "/terms(.*)",
  "/blog(.*)",
  "/global(.*)",
  "/grade(.*)",
  "/opengraph-image(.*)",
  "/twitter-image(.*)",
  "/icon(.*)",
  "/apple-icon(.*)",
  "/robots.txt",
  "/sitemap.xml",
  "/api/school-enquiry",
  "/api/contact",
  "/api/demo-mark",
  "/api/track",
  "/api/rec",
  "/api/waitlist",
  "/api/diagnostic(.*)",
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
