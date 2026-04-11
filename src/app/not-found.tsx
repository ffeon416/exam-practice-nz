import Link from "next/link";

export default function NotFound() {
  return (
    <div className="max-w-md mx-auto px-5 py-20 text-center">
      <h1 className="text-3xl font-bold text-white mb-3">Page not found</h1>
      <p className="text-zinc-400 text-sm mb-8">
        That page doesn&apos;t exist. Maybe try one of these instead?
      </p>
      <div className="flex flex-col gap-3">
        <Link
          href="/subjects"
          className="w-full py-3 rounded-lg bg-indigo-500 text-white font-medium hover:bg-indigo-400 transition-colors"
        >
          Browse exams
        </Link>
        <Link
          href="/"
          className="w-full py-3 rounded-lg border border-zinc-700 text-zinc-300 font-medium hover:bg-zinc-800/50 transition-colors"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
