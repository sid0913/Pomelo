"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { PomeloLogo } from "@/app/components/PomeloLogo";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sessionReady, setSessionReady] = useState(false);
  const router = useRouter();
  const passwordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data: { user } }) => {
        if (!user) {
          router.replace("/");
        } else {
          setSessionReady(true);
          setTimeout(() => passwordRef.current?.focus(), 50);
        }
      });
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setLoading(true);
    setError("");
    const { error } = await createClient().auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setError("Couldn't update your password. The link may have expired — request a new one.");
      return;
    }
    router.push("/courses");
  }

  if (!sessionReady) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#FAFAF9]">
        <div className="w-5 h-5 rounded-full border-2 border-orange-700 border-t-transparent animate-spin" />
      </main>
    );
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

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <h1 className="font-display text-3xl font-semibold text-stone-900 mb-2">
              New password
            </h1>
            <p className="text-stone-500 text-[15px]">
              Choose a strong password for your account.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <div>
              <label
                htmlFor="password"
                className="block text-[13px] font-medium text-stone-600 mb-1.5"
              >
                New password
              </label>
              <input
                id="password"
                ref={passwordRef}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-stone-200 bg-white px-4 py-3 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-orange-700 text-base"
                required
                minLength={8}
              />
            </div>
            <div>
              <label
                htmlFor="confirm"
                className="block text-[13px] font-medium text-stone-600 mb-1.5"
              >
                Confirm password
              </label>
              <input
                id="confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-stone-200 bg-white px-4 py-3 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-orange-700 text-base"
                required
              />
            </div>
          </div>

          {error && <p className="text-red-600 text-sm -mt-2">{error}</p>}

          <button
            type="submit"
            className="w-full rounded-lg bg-orange-700 px-4 py-3.5 text-white font-semibold hover:bg-orange-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-base"
            disabled={loading || !password || !confirm}
          >
            {loading ? "Saving…" : "Set new password →"}
          </button>
        </form>
      </div>
    </main>
  );
}
