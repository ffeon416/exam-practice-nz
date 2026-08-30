import { Bricolage_Grotesque } from "next/font/google";

// Site-wide display face (Soar-style system, rolled out from the homepage).
// Use `display.className` on h1/h2 and major headings only — body stays Geist.
// Bricolage ships no true italic; the browser's synthesized oblique is the
// intended look for accent words.
export const display = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  display: "swap",
});
