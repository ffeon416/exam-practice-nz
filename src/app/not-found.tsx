import Link from "next/link";

export default function NotFound() {
  return (
    <div className="relative flex items-center justify-center min-h-[70vh] px-5">
      {/* Background glow */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] h-[480px] rounded-full bg-indigo-500/[0.07] blur-[120px]" />
      </div>

      <div className="max-w-md w-full text-center">
        <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] px-8 py-12">
          {/* Large 404 */}
          <h1 className="text-[96px] font-bold leading-none tracking-tight bg-gradient-to-b from-indigo-400 to-indigo-600 bg-clip-text text-transparent mb-4">
            404
          </h1>

          <h2 className="text-xl font-semibold text-white mb-2">
            Page not found
          </h2>

          <p className="text-zinc-400 text-sm mb-10">
            That page doesn&apos;t exist — let&apos;s get you back on track.
          </p>

          <div className="flex flex-col gap-3">
            <Link
              href="/"
              className="w-full py-3 rounded-lg bg-indigo-500 text-white font-medium text-sm hover:bg-indigo-400 transition-colors"
            >
              Go home
            </Link>
            <Link
              href="/subjects"
              className="w-full py-3 rounded-lg border border-white/[0.1] text-zinc-300 font-medium text-sm hover:bg-white/[0.04] transition-colors"
            >
              Take an exam
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
