import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import Navbar from "@/components/Navbar";
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
    "Unlimited NCEA practice exams with instant AI marking. Built for NZ students from Year 10 to Year 13.",
  metadataBase: new URL("https://studyace.co.nz"),
  openGraph: {
    title: "StudyAce — Master NCEA Exams",
    description:
      "Unlimited NCEA practice exams with instant AI marking. Built for NZ students.",
    siteName: "StudyAce",
    locale: "en_NZ",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "StudyAce — Master NCEA Exams",
    description:
      "Unlimited NCEA practice exams with instant AI marking. Built for NZ students.",
  },
  keywords: [
    "NCEA",
    "practice exams",
    "NZ students",
    "AI marking",
    "study",
    "Year 10",
    "Year 11",
    "Year 12",
    "Year 13",
    "NZQA",
  ],
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
          colorInputText: "#e4e4e7",
          borderRadius: "0.5rem",
        },
      }}
    >
      <html
        lang="en"
        className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      >
        <body className="min-h-full flex flex-col">
          <Navbar />
          <main className="flex-1">{children}</main>
        </body>
      </html>
    </ClerkProvider>
  );
}
