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
  "/api/stripe-webhook",
  "/api/cron(.*)",
  "/ingest(.*)", // PostHog reverse proxy — must not require auth
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
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
