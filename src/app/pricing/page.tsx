import { redirect } from "next/navigation";

// Pricing lives on the homepage now (free week, local currency): /#pricing.
// This keeps every old link (blog posts, emails, ads, the app's upgrade
// prompts) working. The previous NZD three-period page is in git history
// before 2026-10 (Phase 5 of the free-week funnel).
export default function PricingPage() {
  redirect("/#pricing");
}
