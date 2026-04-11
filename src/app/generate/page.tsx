"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function GeneratePageRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/subjects");
  }, [router]);
  return (
    <div className="max-w-md mx-auto px-5 py-20 text-center">
      <p className="text-zinc-500 text-sm">Redirecting…</p>
    </div>
  );
}
