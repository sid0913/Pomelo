"use client";

import { useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

type Step = "topic" | "email" | "sent" | "returning";

export function LandingPage() {
  const [step, setStep] = useState<Step>("topic");
  const [topic, setTopic] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const topicRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step === "topic") topicRef.current?.focus();
    else if (step === "returning") emailRef.current?.focus();
  }, [step]);

  function handleTopicSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = topic.trim();
    if (!trimmed) return;
    localStorage.setItem("pomelo_pending_topic", trimmed);
    setStep("email");
    setTimeout(() => emailRef.current?.focus(), 50);
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    const supabase = createClient();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
    const pendingTopic = topic.trim();
    const redirectTo = pendingTopic
      ? `${siteUrl}/auth/callback?topic=${encodeURIComponent(pendingTopic)}`
      : `${siteUrl}/auth/callback`;

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: redirectTo },
      });
      if (error) { setErrorMsg("Something went wrong. Please try again."); return; }
    } catch {
      setErrorMsg("Something went wrong. Please try again.");
      return;
    } finally {
      setLoading(false);
    }

    setStep("sent");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-lg">

        {/* Wordmark */}
        <p className="text-center font-[family-name:var(--font-data)] text-[11px] font-semibold tracking-widest text-orange-700 uppercase mb-12">
          Pomelo
        </p>

        {/* ── Topic step ─────────────────────────────────────────── */}
        {step === "topic" && (
          <form onSubmit={handleTopicSubmit} className="step-fade-enter flex flex-col gap-6">
            {/* Badge */}
            <div className="flex justify-center">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FEF3EC] text-[11px] font-semibold text-orange-700 tracking-wide">
                ✦ AI-personalized learning
              </span>
            </div>

            {/* Headline */}
            <h1 className="font-display text-[48px] sm:text-[52px] font-bold text-stone-900 leading-[1.1] text-center">
              The course that skips what you{" "}
              <span className="italic text-orange-700">already know.</span>
            </h1>

            {/* Subheading */}
            <p className="text-center text-stone-500 text-[17px] leading-[1.65]">
              Tell us what you want to learn. Five questions about what you already know.
              Then a course built around exactly your gap — not someone else&apos;s.
            </p>

            {/* Input + CTA */}
            <div className="flex flex-col gap-3 mt-2">
              <label htmlFor="topic" className="sr-only">What do you want to learn?</label>
              <input
                id="topic"
                ref={topicRef}
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., molecular biology, machine learning, options trading…"
                className="w-full rounded-lg border border-stone-200 bg-white px-4 py-3.5 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-orange-700 text-base"
                required
                minLength={2}
                maxLength={200}
              />
              <button
                type="submit"
                className="w-full rounded-lg bg-orange-700 px-4 py-3.5 text-white font-semibold hover:bg-orange-800 transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed text-base"
                disabled={!topic.trim()}
              >
                Get started →
              </button>
            </div>

            <button
              type="button"
              onClick={() => setStep("returning")}
              className="text-sm text-stone-400 hover:text-stone-600 transition-colors text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-700 rounded cursor-pointer"
            >
              Already have an account? Sign in →
            </button>
          </form>
        )}

        {/* ── Email step ─────────────────────────────────────────── */}
        {step === "email" && (
          <form onSubmit={handleEmailSubmit} className="step-fade-enter flex flex-col gap-5">
            <button
              type="button"
              onClick={() => setStep("topic")}
              className="text-sm text-stone-400 hover:text-stone-600 self-start transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-700 rounded"
            >
              ← Back
            </button>

            {/* Topic confirmation */}
            <div className="rounded-xl bg-[#FEF3EC] border border-orange-100 px-5 py-4">
              <p className="font-[family-name:var(--font-data)] text-[11px] font-semibold uppercase tracking-widest text-orange-700 mb-1">
                Your topic
              </p>
              <p className="font-display text-lg font-semibold text-stone-900 italic">
                {topic}
              </p>
            </div>

            <div>
              <h2 className="font-display text-2xl font-semibold text-stone-900 mb-1">
                One more step
              </h2>
              <p className="text-stone-500 text-[15px]">
                Enter your email — we&apos;ll send a sign-in link. Your course starts the moment you click it.
              </p>
            </div>

            <label htmlFor="email" className="sr-only">Email address</label>
            <input
              id="email"
              ref={emailRef}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-lg border border-stone-200 bg-white px-4 py-3.5 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-orange-700 text-base"
              required
            />
            {errorMsg && <p className="text-red-600 text-sm -mt-2">{errorMsg}</p>}
            <button
              type="submit"
              className="w-full rounded-lg bg-orange-700 px-4 py-3.5 text-white font-semibold hover:bg-orange-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-base"
              disabled={loading || !email.trim()}
            >
              {loading ? "Sending…" : "Send sign-in link →"}
            </button>
          </form>
        )}

        {/* ── Returning user step ─────────────────────────────────── */}
        {step === "returning" && (
          <form onSubmit={handleEmailSubmit} className="step-fade-enter flex flex-col gap-5">
            <button
              type="button"
              onClick={() => setStep("topic")}
              className="text-sm text-stone-400 hover:text-stone-600 self-start transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-700 rounded cursor-pointer"
            >
              ← Back
            </button>
            <div>
              <h2 className="font-display text-3xl font-semibold text-stone-900 mb-2">
                Welcome back
              </h2>
              <p className="text-stone-500 text-[15px]">
                Enter your email and we&apos;ll send a sign-in link.
              </p>
            </div>
            <label htmlFor="returning-email" className="sr-only">Email address</label>
            <input
              id="returning-email"
              ref={emailRef}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-lg border border-stone-200 bg-white px-4 py-3.5 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-orange-700 text-base"
              required
            />
            {errorMsg && <p className="text-red-600 text-sm -mt-2">{errorMsg}</p>}
            <button
              type="submit"
              className="w-full rounded-lg bg-orange-700 px-4 py-3.5 text-white font-semibold hover:bg-orange-800 transition-colors disabled:opacity-50 text-base"
              disabled={loading || !email.trim()}
            >
              {loading ? "Sending…" : "Send sign-in link →"}
            </button>
          </form>
        )}

        {/* ── Sent step ──────────────────────────────────────────── */}
        {step === "sent" && (
          <div className="step-fade-enter text-center">
            <div className="w-12 h-12 rounded-full bg-[#F2FAF5] flex items-center justify-center mx-auto mb-6">
              <span className="text-green-700 text-xl">✓</span>
            </div>
            <h2 className="font-display text-3xl font-semibold text-stone-900 mb-3">
              Check your inbox
            </h2>
            <p className="text-stone-500 text-[17px] leading-relaxed max-w-sm mx-auto">
              We sent a link to{" "}
              <span className="font-medium text-stone-700">{email}</span>.{" "}
              {topic.trim() ? (
                <>
                  Click it to start building your personalized{" "}
                  <span className="font-medium text-stone-700 italic font-display">{topic}</span> course.
                </>
              ) : (
                "Click it to sign in."
              )}
            </p>
            <p className="mt-5 text-sm text-stone-400">
              Didn&apos;t get it? Check your spam folder.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
