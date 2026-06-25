import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { Analytics } from "@vercel/analytics/next";
import Navbar from "@/components/Navbar";
import PageViewTracker from "@/components/PageViewTracker";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import UserScopeSync from "@/components/UserScopeSync";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "StudyAce — Master NCEA Exams",
  description:
    "Unlimited NCEA practice exams with instant StudyAce marking. Built for NZ students from Year 10 to Year 13.",
  metadataBase: new URL("https://studyace.co"),
  openGraph: {
    title: "StudyAce — Master NCEA Exams",
    description:
      "Unlimited NCEA practice exams with instant StudyAce marking. Built for NZ students.",
    siteName: "StudyAce",
    locale: "en_NZ",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "StudyAce — Master NCEA Exams",
    description:
      "Unlimited NCEA practice exams with instant StudyAce marking. Built for NZ students.",
  },
  keywords: [
    "NCEA",
    "practice exams",
    "NZ students",
    "StudyAce marking",
    "study",
    "Year 10",
    "Year 11",
    "Year 12",
    "Year 13",
    "NZQA",
  ],
  // Installed-to-home-screen (iOS): full-screen standalone, app title, and a
  // black status bar that blends into the #06060a app background.
  appleWebApp: {
    capable: true,
    title: "StudyAce",
    statusBarStyle: "black",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#06060a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      appearance={{
        baseTheme: dark,
        variables: {
          colorPrimary: "#6366f1",
          colorBackground: "#0a0a0f",
          colorInputBackground: "#141419",
          colorInputText: "#f4f4f5",
          colorText: "#f4f4f5",
          colorTextSecondary: "#a1a1aa",
          colorNeutral: "#ffffff",
          borderRadius: "0.5rem",
        },
        elements: {
          rootBox: "w-full",
          card: "bg-[#0c0c12] border border-white/10 shadow-2xl shadow-black/40",
          headerTitle: "text-white text-2xl font-bold",
          headerSubtitle: "text-zinc-400",
          socialButtonsBlockButton:
            "border border-white/15 hover:bg-white/5 text-white",
          socialButtonsBlockButtonText: "text-white font-medium",
          socialButtonsBlockButtonArrow: "text-white",
          dividerLine: "bg-white/10",
          dividerText: "text-zinc-400",
          formFieldLabel: "text-zinc-300",
          formFieldInput:
            "bg-[#141419] border border-white/10 text-zinc-100 focus:border-indigo-500/50",
          formButtonPrimary:
            "bg-indigo-500 hover:bg-indigo-400 text-white font-semibold",
          footerActionText: "text-zinc-400",
          footerActionLink: "text-indigo-400 hover:text-indigo-300 font-medium",
          identityPreviewText: "text-zinc-200",
          identityPreviewEditButton: "text-indigo-400 hover:text-indigo-300",
          formResendCodeLink: "text-indigo-400 hover:text-indigo-300",
          otpCodeFieldInput: "bg-[#141419] border border-white/10 text-white",
        },
      }}
    >
      <html
        lang="en"
        className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      >
        <body className="min-h-full flex flex-col">
          <UserScopeSync />
          <Navbar />
          <main className="flex-1">{children}</main>
          <Analytics />
          <PageViewTracker />
          <ServiceWorkerRegister />
        </body>
      </html>
    </ClerkProvider>
  );
}
