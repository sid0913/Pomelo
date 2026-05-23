import Link from "next/link";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-sm w-full text-center">
        <p className="text-xs font-semibold tracking-widest text-amber-600 uppercase mb-8">
          Pomelo
        </p>
        <h1 className="text-2xl font-semibold text-stone-900 mb-2">
          Check your inbox
        </h1>
        <p className="text-stone-500 text-base leading-relaxed">
          We sent you a sign-in link. Click it to start building your
          personalized course.
        </p>
        <p className="mt-6 text-sm text-stone-400">
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
