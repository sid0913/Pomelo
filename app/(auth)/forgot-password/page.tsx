"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { PomeloLogo } from "@/app/components/PomeloLogo";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });
    setLoading(false);
    if (error) {
      setError("Couldn't send a reset link. Please try again.");
      return;
    }
    setSent(true);
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 bg-[#FAFAF9]">
      <div className="w-full max-w-sm">
        <Link href="/" className="flex items-center gap-2 mb-10">
          <PomeloLogo size={32} />
          <span className="font-display text-2xl font-bold text-orange-700 leading-none">
            pomelo
          </span>
        </Link>

        {sent ? (
          <div className="flex flex-col gap-4">
            <div className="w-12 h-12 rounded-full bg-[#F2FAF5] flex items-center justify-center">
              <span className="text-green-700 text-xl">✓</span>
            </div>
            <h1 className="font-display text-3xl font-semibold text-stone-900">
              Check your inbox
            </h1>
            <p className="text-stone-500 text-[16px] leading-relaxed">
              We sent a reset link to{" "}
              <span className="font-medium text-stone-700">{email}</span>. Click
              it to set a new password.
            </p>
            <p className="text-sm text-stone-400">
              Didn&apos;t get it? Check your spam folder.
            </p>
            <Link
              href="/"
              className="mt-2 text-sm text-stone-400 hover:text-stone-600 transition-colors"
            >
              ← Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <h1 className="font-display text-3xl font-semibold text-stone-900 mb-2">
                Reset password
              </h1>
              <p className="text-stone-500 text-[15px]">
                Enter your email and we&apos;ll send you a reset link.
              </p>
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-[13px] font-medium text-stone-600 mb-1.5"
              >
                Email
              </label>
              <input
                id="email"
                ref={emailRef}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-lg border border-stone-200 bg-white px-4 py-3 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-orange-700 text-base"
                required
              />
            </div>

            {error && <p className="text-red-600 text-sm -mt-2">{error}</p>}

            <button
              type="submit"
              className="w-full rounded-lg bg-orange-700 px-4 py-3.5 text-white font-semibold hover:bg-orange-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-base"
              disabled={loading || !email.trim()}
            >
              {loading ? "Sending…" : "Send reset link →"}
            </button>

            <Link
              href="/"
              className="text-sm text-stone-400 hover:text-stone-600 transition-colors text-center"
            >
              ← Back to sign in
            </Link>
          </form>
        )}
      </div>
    </main>
  );
}
