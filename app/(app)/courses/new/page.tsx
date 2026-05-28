"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { OptionRow } from "./OptionRow";
import { OtherRow } from "./OtherRow";
import { toTitleCase } from "@/lib/format";

const LETTERS = ["A", "B", "C", "D"] as const;

const LOADING_VERBS = [
  "thinking...",
  "exploring...",
  "calibrating...",
  "mapping gaps...",
  "connecting ideas...",
  "charting your path...",
];

const TOTAL_QUESTIONS = 5;
const MIN_HOLD_MS = 800;
const EXIT_ANIMATION_MS = 150;

type QualifyingResponse = {
  done: boolean;
  sessionId?: string;
  question?: string;
  options?: string[];
  courseId?: string;
};

async function callQualifyingChat(payload: {
  sessionId?: string;
  topic?: string;
  userMessage: string;
  truncateToTurns?: number;
}): Promise<QualifyingResponse> {
  const start = Date.now();
  const res = await fetch("/api/qualifying-chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-timezone": Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  const elapsed = Date.now() - start;
  if (elapsed < MIN_HOLD_MS) {
    await new Promise((r) => setTimeout(r, MIN_HOLD_MS - elapsed));
  }
  return data as QualifyingResponse;
}

type WizardStep = {
  question: string;
  options: string[];
  selectedIndex: number | null;
  freeText: string;
};

type Phase = "loading" | "question" | "exiting" | "creating";

export default function NewCoursePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [topic, setTopic] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [verbIndex, setVerbIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [steps, setSteps] = useState<WizardStep[]>([]);
  const [currentStep, setCurrentStep] = useState(0);

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [freeText, setFreeText] = useState("");
  const [focusedOption, setFocusedOption] = useState<number>(0);

  const [chips, setChips] = useState<string[]>([]);
  const [chipInput, setChipInput] = useState("");
  const [q5Skipped, setQ5Skipped] = useState(false);

  const chipInputRef = useRef<HTMLInputElement>(null);
  const continueRef = useRef<HTMLButtonElement>(null);
  const focusedOptionRef = useRef(0);

  const isQ5 = currentStep === TOTAL_QUESTIONS - 1;
  const canContinue = isQ5
    ? chips.length > 0 || q5Skipped
    : selectedIndex !== null && (selectedIndex < 4 || freeText.trim().length > 0);

  useEffect(() => {
    if (phase !== "loading") return;
    const id = setInterval(
      () => setVerbIndex((i) => (i + 1) % LOADING_VERBS.length),
      2000
    );
    return () => clearInterval(id);
  }, [phase]);

  useEffect(() => {
    const fromUrl = searchParams.get("topic");
    const fromStorage = localStorage.getItem("pomelo_pending_topic");
    const resolved = fromUrl || fromStorage || "";
    if (!resolved) {
      router.replace("/");
      return;
    }
    setTopic(resolved);
    void fetchNextQuestion(resolved, null, [], undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchNextQuestion(
    topicOverride: string,
    sid: string | null,
    currentTurns: WizardStep[],
    truncateToTurns: number | undefined
  ) {
    setPhase("loading");
    setError(null);

    const lastStep = currentTurns[currentTurns.length - 1];
    let userMessage: string;

    if (!lastStep) {
      userMessage = topicOverride;
    } else if (
      lastStep.selectedIndex !== null &&
      lastStep.selectedIndex < lastStep.options.length
    ) {
      userMessage = lastStep.options[lastStep.selectedIndex];
    } else {
      userMessage = lastStep.freeText;
    }

    try {
      const data = await callQualifyingChat({
        sessionId: sid ?? undefined,
        topic: sid ? undefined : topicOverride,
        userMessage,
        truncateToTurns,
      });

      if (data.done) {
        localStorage.removeItem("pomelo_pending_topic");
        setPhase("creating");
        setTimeout(() => router.push(`/courses/${data.courseId}?new=1`), 800);
        return;
      }

      setSessionId(data.sessionId ?? null);

      const newStep: WizardStep = {
        question: data.question ?? "",
        options: data.options ?? [],
        selectedIndex: null,
        freeText: "",
      };

      if (currentTurns.length === 0) {
        setSteps([newStep]);
        setCurrentStep(0);
      } else {
        setSteps((prev) => {
          const updated = [...prev];
          updated[currentTurns.length] = newStep;
          return updated.slice(0, currentTurns.length + 1);
        });
        setCurrentStep(currentTurns.length);
      }

      setSelectedIndex(null);
      setFreeText("");
      setFocusedOption(0);
      setPhase("question");
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again.");
      setPhase("question");
    }
  }

  const handleContinue = useCallback(async () => {
    if (!canContinue || phase !== "question") return;

    const savedStep: WizardStep = {
      ...steps[currentStep],
      selectedIndex,
      freeText,
    };

    let finalSteps: WizardStep[];
    if (isQ5) {
      const chipMessage =
        chips.length > 0
          ? `Topics I want to cover: ${chips.join(", ")}`
          : "No specific topics preference";

      finalSteps = [...steps.slice(0, currentStep), { ...savedStep, freeText: chipMessage, selectedIndex: null }];
    } else {
      finalSteps = [...steps.slice(0, currentStep), savedStep];
    }

    setSteps(finalSteps);
    setPhase("exiting");

    await new Promise((r) => setTimeout(r, EXIT_ANIMATION_MS));

    if (isQ5) {
      const lastStep = finalSteps[finalSteps.length - 1];
      const chipMessage = lastStep.freeText;

      setPhase("loading");

      try {
        const data = await callQualifyingChat({
          sessionId: sessionId ?? undefined,
          userMessage: chipMessage,
        });

        if (data.done) {
          localStorage.removeItem("pomelo_pending_topic");
          setPhase("creating");
          setTimeout(() => router.push(`/courses/${data.courseId}?new=1`), 800);
        }
      } catch (err) {
        console.error(err);
        setError("Something went wrong. Please try again.");
        setPhase("question");
      }
    } else {
      await fetchNextQuestion(topic, sessionId, finalSteps, currentStep * 2);
    }
  }, [canContinue, phase, steps, currentStep, selectedIndex, freeText, isQ5, chips, topic, sessionId]);

  function handleExit() {
    localStorage.removeItem("pomelo_pending_topic");
    router.push("/courses");
  }

  const handleBack = useCallback(async () => {
    if (currentStep === 0) return;

    const prevStepIndex = currentStep - 1;
    const prevStep = steps[prevStepIndex];

    setPhase("exiting");
    await new Promise((r) => setTimeout(r, EXIT_ANIMATION_MS));

    setCurrentStep(prevStepIndex);
    setSelectedIndex(prevStep.selectedIndex);
    setFreeText(prevStep.freeText);
    setFocusedOption(prevStep.selectedIndex ?? 0);
    setChips([]);
    setChipInput("");
    setQ5Skipped(false);
    setError(null);
    setPhase("question");
  }, [currentStep, steps]);

  const handleAnswerChange = useCallback(
    async (newIndex: number | null, newText: string) => {
      const recorded = steps[currentStep];
      const changed =
        newIndex !== recorded?.selectedIndex || newText !== recorded?.freeText;

      if (newIndex !== null) {
        setSelectedIndex(newIndex);
        setFreeText(newIndex === 4 ? newText : "");
        setFocusedOption(newIndex);
      } else {
        setSelectedIndex(null);
        setFreeText(newText);
      }

      if (changed && currentStep < steps.length - 1) {
        setSteps((prev) => prev.slice(0, currentStep + 1));
      }
    },
    [currentStep, steps]
  );

  useEffect(() => { focusedOptionRef.current = focusedOption; }, [focusedOption]);

  useEffect(() => {
    if (phase !== "question" || isQ5) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const letterIdx = ["a", "b", "c", "d"].indexOf(e.key.toLowerCase());
      if (letterIdx !== -1 && steps[currentStep]?.options[letterIdx] !== undefined) {
        e.preventDefault();
        handleAnswerChange(letterIdx, "");
      }
      if (e.key.toLowerCase() === "e") {
        e.preventDefault();
        handleAnswerChange(4, freeText);
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        const max = steps[currentStep]?.options.length ?? 0;
        const next = Math.min(focusedOptionRef.current + 1, max);
        handleAnswerChange(next, next === 4 ? freeText : "");
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        const prev = Math.max(focusedOptionRef.current - 1, 0);
        handleAnswerChange(prev, "");
      }
      if (e.key === "Enter" && canContinue) {
        void handleContinue();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [phase, isQ5, steps, currentStep, canContinue, freeText, handleContinue, handleAnswerChange]);

  function addChip(value: string) {
    const trimmed = value.trim();
    if (!trimmed || chips.includes(trimmed)) return;
    setChips((prev) => [...prev, trimmed]);
    setChipInput("");
    setQ5Skipped(false);
  }

  function removeChip(chip: string) {
    setChips((prev) => prev.filter((c) => c !== chip));
  }

  // ── Creating state ──────────────────────────────────────────
  if (phase === "creating") {
    return (
      <div className="min-h-screen bg-[#1A1410] flex flex-col items-center justify-center gap-4">
        <div className="w-8 h-8 rounded-full border-2 border-stone-700 border-t-amber-600 animate-spin" />
        <p className="text-sm font-medium text-stone-500">Creating your personalized course…</p>
      </div>
    );
  }

  const step = steps[currentStep];
  const questionNumber = currentStep + 1;
  const isChangingAnswer =
    phase === "question" &&
    currentStep < steps.length - 1 &&
    (selectedIndex !== steps[currentStep]?.selectedIndex ||
      freeText !== steps[currentStep]?.freeText);

  return (
    <div className="min-h-screen bg-[#1A1410] flex flex-col items-center justify-center px-4 py-10 gap-5">

      {/* Loading / thinking state — verb shimmer floats on dark bg */}
      {(phase === "loading" || phase === "exiting") && (
        <span key={verbIndex} className="verb-shimmer text-xl italic">
          {LOADING_VERBS[verbIndex]}
        </span>
      )}

      {/* Question card */}
      {phase === "question" && step && (
        <>
          <div className="w-full max-w-lg bg-[#FFFDF5] rounded-[14px] shadow-[0_20px_60px_rgba(0,0,0,0.55)] overflow-hidden question-enter">

            {/* Card header: progress + navigation */}
            <div className="px-6 pt-5 pb-0 flex items-center justify-between">
              {currentStep > 0 ? (
                <button
                  onClick={handleBack}
                  className="text-sm text-stone-400 hover:text-stone-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-700 rounded"
                  aria-label="Go back to previous question"
                >
                  ← Back
                </button>
              ) : (
                <span />
              )}

              <div className="flex items-center gap-3">
                <div
                  role="status"
                  aria-label={`Question ${questionNumber} of ${TOTAL_QUESTIONS}`}
                  aria-live="polite"
                  className="flex items-center gap-1.5"
                >
                  {Array.from({ length: TOTAL_QUESTIONS }, (_, i) => (
                    <span
                      key={i}
                      className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${
                        i < questionNumber ? "bg-orange-700" : "bg-stone-300"
                      }`}
                    />
                  ))}
                </div>
                <button
                  onClick={handleExit}
                  className="text-xs text-stone-400 hover:text-stone-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-700 rounded cursor-pointer"
                  aria-label="Exit qualifying session"
                >
                  Exit
                </button>
              </div>
            </div>

            {/* Card body */}
            <div className="px-6 sm:px-8 pt-5 pb-6">

              {/* Topic overline on Q1 */}
              {currentStep === 0 && (
                <p className="font-[family-name:var(--font-data)] text-[11px] font-semibold uppercase tracking-widest text-stone-400 mb-4">
                  {toTitleCase(topic)} · {TOTAL_QUESTIONS} questions
                </p>
              )}

              {/* Question text */}
              {!isQ5 && (
                <h1 className="font-display text-xl sm:text-[22px] font-semibold text-[#1C1917] leading-snug mb-5">
                  {step.question}
                </h1>
              )}

              {/* Q5: specific topics chip input */}
              {isQ5 && (
                <>
                  <h1 className="font-display text-xl sm:text-[22px] font-semibold text-[#1C1917] leading-snug mb-5">
                    Any specific topics you want to make sure we cover?
                  </h1>

                  <div className="flex flex-col gap-3 mb-5">
                    <div className="flex flex-wrap gap-2 min-h-[36px]">
                      {chips.map((chip) => (
                        <span
                          key={chip}
                          className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#FEF3EC] border border-orange-200 rounded-full text-sm text-orange-900"
                        >
                          {chip}
                          <button
                            onClick={() => removeChip(chip)}
                            aria-label={`Remove ${chip}`}
                            className="p-1 -m-0.5 text-orange-600 hover:text-orange-800 leading-none"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <input
                        ref={chipInputRef}
                        type="text"
                        value={chipInput}
                        onChange={(e) => setChipInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addChip(chipInput);
                          }
                        }}
                        placeholder="Add topic…"
                        className="flex-1 rounded-lg border border-stone-200 bg-white px-4 py-2.5 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-orange-700 text-sm"
                      />
                      <button
                        onClick={() => addChip(chipInput)}
                        disabled={!chipInput.trim()}
                        className="rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-600 hover:bg-stone-50 disabled:opacity-40 transition-colors"
                      >
                        Add
                      </button>
                    </div>

                    {chips.length === 0 && (
                      <button
                        onClick={() => setQ5Skipped(!q5Skipped)}
                        className={`self-start text-sm transition-colors cursor-pointer ${
                          q5Skipped
                            ? "text-orange-700 font-medium"
                            : "text-stone-400 hover:text-stone-700 underline underline-offset-2 decoration-stone-300 hover:decoration-stone-500"
                        }`}
                      >
                        {q5Skipped ? "No specific topics · undo" : "Skip — no specific topics in mind"}
                      </button>
                    )}
                  </div>
                </>
              )}

              {/* A/B/C/D/↩ options */}
              {!isQ5 && step.options.length > 0 && (
                <div
                  role="radiogroup"
                  aria-label={step.question}
                  className="rounded-lg overflow-hidden border border-stone-200"
                >
                  {step.options.map((opt, i) => (
                    <OptionRow
                      key={i}
                      letter={LETTERS[i]}
                      text={opt}
                      selected={selectedIndex === i}
                      focused={focusedOption === i}
                      dimmed={false}
                      onSelect={() => handleAnswerChange(i, "")}
                      onFocus={() => setFocusedOption(i)}
                      staggerIndex={i}
                    />
                  ))}
                  <OtherRow
                    selected={selectedIndex === 4}
                    focused={focusedOption === 4}
                    onSelect={() => handleAnswerChange(4, freeText)}
                    onFocus={() => setFocusedOption(4)}
                    value={freeText}
                    onChange={(text) => handleAnswerChange(4, text)}
                    onArrowUp={() => {
                      const prevIdx = step.options.length - 1;
                      handleAnswerChange(prevIdx, "");
                    }}
                    staggerIndex={step.options.length}
                  />
                </div>
              )}

              {isChangingAnswer && (
                <p className="text-xs text-stone-400 italic mt-3">
                  Changing this will clear your later answers.
                </p>
              )}

              {error && (
                <p className="text-sm text-red-600 mt-4">{error}</p>
              )}

              {/* Nav hint + Continue */}
              <div className="flex items-center justify-between mt-6">
                <span className="hidden sm:block font-[family-name:var(--font-data)] text-[11px] text-[#C9BFB5]">
                  ↑ ↓ &nbsp;navigate &nbsp;·&nbsp; ↵ &nbsp;select
                </span>
                <button
                  ref={continueRef}
                  onClick={handleContinue}
                  disabled={!canContinue}
                  className="ml-auto rounded-lg bg-orange-700 px-6 py-2.5 text-sm font-semibold text-white hover:bg-orange-800 transition-colors disabled:opacity-40 min-h-[40px] cursor-pointer disabled:cursor-not-allowed"
                >
                  {isQ5 ? "Finish →" : "Continue →"}
                </button>
              </div>
            </div>
          </div>

          {/* Wordmark below card */}
          <p className="font-[family-name:var(--font-data)] text-[11px] font-semibold tracking-widest uppercase text-[#C9BFB5]">
            Pomelo
          </p>
        </>
      )}
    </div>
  );
}
