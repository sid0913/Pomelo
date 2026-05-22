"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

type Step = "topic" | "email" | "sent";

export function LandingPage() {
  const [step, setStep] = useState<Step>("topic");
  const [topic, setTopic] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const emailRef = useRef<HTMLInputElement>(null);

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
    const redirectTo = `${siteUrl}/auth/callback?topic=${encodeURIComponent(topic.trim())}`;

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: redirectTo },
    });

    setLoading(false);

    if (error) {
      setErrorMsg("Something went wrong. Please try again.");
      return;
    }

    setStep("sent");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">
        <p className="text-center text-xs font-semibold tracking-widest text-amber-600 uppercase mb-10">
          Pomelo
        </p>

        {step === "topic" && (
          <form onSubmit={handleTopicSubmit} className="step-fade-enter flex flex-col gap-4">
            <h1 className="text-center text-4xl font-bold text-stone-900 leading-tight mb-2">
              The course that skips what you already know.
            </h1>
            <p className="text-center text-stone-500 mb-2">
              What do you want to learn?
            </p>
            <label htmlFor="topic" className="sr-only">
              Topic
            </label>
            <input
              id="topic"
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., molecular biology, machine learning, financial modeling"
              className="w-full rounded-lg border border-stone-200 bg-white px-4 py-3 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500 text-base"
              autoFocus
              required
              minLength={2}
              maxLength={200}
            />
            <button
              type="submit"
              className="w-full rounded-lg bg-amber-600 px-4 py-3 text-white font-semibold hover:bg-amber-700 transition-colors disabled:opacity-50"
              disabled={!topic.trim()}
            >
              Get started →
            </button>
          </form>
        )}

        {step === "email" && (
          <form onSubmit={handleEmailSubmit} className="step-fade-enter flex flex-col gap-4">
            <button
              type="button"
              onClick={() => setStep("topic")}
              className="text-sm text-stone-400 hover:text-stone-600 self-start mb-1"
            >
              ← Back
            </button>
            <div className="rounded-lg bg-amber-50 border border-amber-100 px-4 py-3">
              <p className="text-sm text-stone-600">
                <span className="font-medium text-stone-800">Your topic:</span>{" "}
                {topic}
              </p>
            </div>
            <p className="text-stone-700 font-medium">
              Enter your email — we&apos;ll send you a sign-in link.
            </p>
            <p className="text-sm text-stone-400 -mt-2">
              Your topic is saved. You&apos;ll start building your course right
              after clicking the link.
            </p>
            <label htmlFor="email" className="sr-only">
              Email address
            </label>
            <input
              id="email"
              ref={emailRef}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-lg border border-stone-200 bg-white px-4 py-3 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500 text-base"
              required
            />
            {errorMsg && <p className="text-red-600 text-sm">{errorMsg}</p>}
            <button
              type="submit"
              className="w-full rounded-lg bg-amber-600 px-4 py-3 text-white font-semibold hover:bg-amber-700 transition-colors disabled:opacity-50"
              disabled={loading || !email.trim()}
            >
              {loading ? "Sending…" : "Send sign-in link →"}
            </button>
          </form>
        )}

        {step === "sent" && (
          <div className="step-fade-enter text-center">
            <h2 className="text-2xl font-semibold text-stone-900 mb-2">
              Check your inbox
            </h2>
            <p className="text-stone-500 leading-relaxed">
              We sent a sign-in link to{" "}
              <span className="font-medium text-stone-700">{email}</span>. Click
              it to start building your personalized{" "}
              <span className="font-medium text-stone-700">{topic}</span> course.
            </p>
            <p className="mt-4 text-sm text-stone-400">
              Didn&apos;t get it? Check your spam folder.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
