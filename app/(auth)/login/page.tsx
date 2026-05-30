import Link from "next/link";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-sm w-full text-center">
        <p className="font-[family-name:var(--font-data)] text-[11px] font-semibold tracking-widest text-orange-700 uppercase mb-10">
          Pomelo
        </p>
        <div className="w-12 h-12 rounded-full bg-[#F2FAF5] flex items-center justify-center mx-auto mb-6">
          <span className="text-green-700 text-xl">✓</span>
        </div>
        <h1 className="font-display text-3xl font-semibold text-stone-900 mb-3">
          Check your inbox
        </h1>
        <p className="text-stone-500 text-[16px] leading-relaxed">
          We sent you a sign-in link. Click it to start building your
          personalized course.
        </p>
        <p className="mt-5 text-sm text-stone-400">
          Didn&apos;t get it? Check your spam folder.
        </p>
        <Link
          href="/"
          className="mt-8 inline-block text-sm text-stone-400 hover:text-stone-600 transition-colors"
        >
          ← Back to sign in
        </Link>
      </div>
    </main>
  );
}
