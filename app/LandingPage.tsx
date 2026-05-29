"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PomeloLogo } from "@/app/components/PomeloLogo";

type Step = "topic" | "email" | "otp" | "signin";

export function LandingPage() {
  const [step, setStep] = useState<Step>("topic");
  const [topic, setTopic] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const topicRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const otpRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (step === "topic") topicRef.current?.focus();
    else if (step === "email") setTimeout(() => emailRef.current?.focus(), 50);
    else if (step === "otp") setTimeout(() => otpRef.current?.focus(), 50);
    else if (step === "signin") setTimeout(() => emailRef.current?.focus(), 50);
  }, [step]);

  function handleTopicSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = topic.trim();
    if (!trimmed) return;
    setStep("email");
  }

  // New user: send OTP code to email
  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true },
    });
    setLoading(false);
    if (error) { setErrorMsg("Couldn't send a code. Please try again."); return; }
    setStep("otp");
  }

  // New user: verify OTP code
  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: otp.trim(),
      type: "email",
    });
    setLoading(false);
    if (error) { setErrorMsg("Invalid code — check your inbox and try again."); return; }
    const pendingTopic = topic.trim();
    if (pendingTopic) {
      router.push(`/courses/new?topic=${encodeURIComponent(pendingTopic)}`);
    } else {
      router.push("/courses");
    }
  }

  // Returning user: sign in with password
  async function handlePasswordSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);
    if (error) {
      setErrorMsg("Wrong email or password.");
      return;
    }
    router.push("/courses");
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* Header */}
      <header className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-stone-100">
        <button
          type="button"
          onClick={() => { setStep("topic"); setErrorMsg(""); }}
          className="flex items-center gap-2 cursor-pointer"
        >
          <PomeloLogo size={35} />
          <span className="font-display text-xl font-bold text-orange-700 leading-none">
            pomelo
          </span>
        </button>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => { setStep("signin"); setErrorMsg(""); }}
            className="text-[14px] text-stone-500 hover:text-stone-800 transition-colors cursor-pointer"
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => { setStep("topic"); setErrorMsg(""); setTimeout(() => topicRef.current?.focus(), 50); }}
            className="rounded-full bg-orange-700 px-4 py-2 text-[13px] font-semibold text-white hover:bg-orange-800 transition-colors cursor-pointer"
          >
            Start learning
          </button>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-4 py-16">
        <div className="w-full max-w-lg">

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
            </form>
          )}

          {/* ── Email step (new user: send OTP) ────────────────────── */}
          {step === "email" && (
            <form onSubmit={handleSendOtp} className="step-fade-enter flex flex-col gap-5">
              <button
                type="button"
                onClick={() => { setStep("topic"); setErrorMsg(""); }}
                className="text-sm text-stone-400 hover:text-stone-600 self-start transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-700 rounded cursor-pointer"
              >
                ← Back
              </button>

              {/* Topic confirmation */}
              {topic.trim() && (
                <div className="rounded-xl bg-[#FEF3EC] border border-orange-100 px-5 py-4">
                  <p className="font-[family-name:var(--font-data)] text-[11px] font-semibold uppercase tracking-widest text-orange-700 mb-1">
                    Your topic
                  </p>
                  <p className="font-display text-lg font-semibold text-stone-900 italic">
                    {topic}
                  </p>
                </div>
              )}

              <div>
                <h2 className="font-display text-2xl font-semibold text-stone-900 mb-1">
                  One more step
                </h2>
                <p className="text-stone-500 text-[15px]">
                  Enter your email — we&apos;ll send a 6-digit code to verify it&apos;s you.
                </p>
              </div>

              <label htmlFor="email-new" className="sr-only">Email address</label>
              <input
                id="email-new"
                ref={emailRef}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                {loading ? "Sending…" : "Send code →"}
              </button>
            </form>
          )}

          {/* ── OTP step (enter 6-digit code) ──────────────────────── */}
          {step === "otp" && (
            <form onSubmit={handleVerifyOtp} className="step-fade-enter flex flex-col gap-5">
              <button
                type="button"
                onClick={() => { setStep("email"); setErrorMsg(""); setOtp(""); }}
                className="text-sm text-stone-400 hover:text-stone-600 self-start transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-700 rounded cursor-pointer"
              >
                ← Back
              </button>

              <div>
                <h2 className="font-display text-2xl font-semibold text-stone-900 mb-1">
                  Check your inbox
                </h2>
                <p className="text-stone-500 text-[15px]">
                  We sent a 6-digit code to{" "}
                  <span className="font-medium text-stone-700">{email}</span>.
                  Enter it below.
                </p>
              </div>

              <label htmlFor="otp" className="sr-only">Verification code</label>
              <input
                id="otp"
                ref={otpRef}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                className="w-full rounded-lg border border-stone-200 bg-white px-4 py-3.5 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-orange-700 text-base font-[family-name:var(--font-data)] tracking-[0.3em] text-center text-xl"
                required
                maxLength={6}
              />
              {errorMsg && <p className="text-red-600 text-sm -mt-2 text-center">{errorMsg}</p>}
              <button
                type="submit"
                className="w-full rounded-lg bg-orange-700 px-4 py-3.5 text-white font-semibold hover:bg-orange-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-base"
                disabled={loading || otp.length < 6}
              >
                {loading ? "Verifying…" : "Verify →"}
              </button>
              <p className="text-sm text-stone-400 text-center">
                Didn&apos;t get it? Check your spam folder or{" "}
                <button
                  type="button"
                  onClick={() => { setOtp(""); setStep("email"); setErrorMsg(""); }}
                  className="text-orange-700 hover:text-orange-800 underline cursor-pointer"
                >
                  resend
                </button>
                .
              </p>
            </form>
          )}

          {/* ── Sign in step (returning user: email + password) ─────── */}
          {step === "signin" && (
            <form onSubmit={handlePasswordSignIn} className="step-fade-enter flex flex-col gap-5">
              <button
                type="button"
                onClick={() => { setStep("topic"); setErrorMsg(""); }}
                className="text-sm text-stone-400 hover:text-stone-600 self-start transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-700 rounded cursor-pointer"
              >
                ← Back
              </button>

              <div>
                <h2 className="font-display text-3xl font-semibold text-stone-900 mb-2">
                  Welcome back
                </h2>
                <p className="text-stone-500 text-[15px]">
                  Sign in with your email and password.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <div>
                  <label htmlFor="email-signin" className="block text-[13px] font-medium text-stone-600 mb-1.5">
                    Email
                  </label>
                  <input
                    id="email-signin"
                    ref={emailRef}
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-lg border border-stone-200 bg-white px-4 py-3 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-orange-700 text-base"
                    required
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="password" className="block text-[13px] font-medium text-stone-600">
                      Password
                    </label>
                    <a
                      href="/forgot-password"
                      className="text-[13px] text-stone-400 hover:text-orange-700 transition-colors"
                    >
                      Forgot password?
                    </a>
                  </div>
                  <input
                    id="password"
                    ref={passwordRef}
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-lg border border-stone-200 bg-white px-4 py-3 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-orange-700 text-base"
                    required
                  />
                </div>
              </div>

              {errorMsg && <p className="text-red-600 text-sm -mt-2">{errorMsg}</p>}

              <button
                type="submit"
                className="w-full rounded-lg bg-orange-700 px-4 py-3.5 text-white font-semibold hover:bg-orange-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-base"
                disabled={loading || !email.trim() || !password}
              >
                {loading ? "Signing in…" : "Sign in →"}
              </button>

              <p className="text-sm text-stone-400 text-center">
                New here?{" "}
                <button
                  type="button"
                  onClick={() => { setStep("topic"); setErrorMsg(""); }}
                  className="text-orange-700 hover:text-orange-800 cursor-pointer"
                >
                  Start learning →
                </button>
              </p>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
