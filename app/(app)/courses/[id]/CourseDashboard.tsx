"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toTitleCase } from "@/lib/format";

type Chapter = {
  id: string;
  chapter_index: number;
  title: string;
  estimated_minutes: number;
  status: "pending" | "generating" | "done" | "failed";
};

type Course = {
  id: string;
  topic: string;
  daily_goal: number;
  totalMinutes: number;
};

type Props = {
  course: Course;
  chapters: Chapter[];
  completedIds: Set<string>;
  completedToday: number;
  streak: number;
  isNew: boolean;
};

export function CourseDashboard({
  course,
  chapters,
  completedIds,
  completedToday,
  streak,
  isNew,
}: Props) {
  const [headerVisible, setHeaderVisible] = useState(isNew);

  useEffect(() => {
    if (!isNew) return;
    const t = setTimeout(() => setHeaderVisible(false), 4000);
    return () => clearTimeout(t);
  }, [isNew]);

  const remaining = course.daily_goal - completedToday;
  const goalMet = remaining <= 0;
  const totalHours = Math.round(course.totalMinutes / 60 * 10) / 10;
  const completedTotal = chapters.filter(c => completedIds.has(c.id)).length;
  const pct = chapters.length > 0 ? Math.round((completedTotal / chapters.length) * 100) : 0;

  return (
    <div className="bg-stone-50 min-h-full">
      <div className="max-w-2xl mx-auto px-4 py-10">

        {/* Back link */}
        <Link
          href="/courses"
          className="inline-flex items-center gap-1.5 text-sm text-stone-400 hover:text-stone-700 transition-colors mb-8"
        >
          ← My courses
        </Link>

        {/* Course ready banner */}
        {headerVisible && (
          <div
            className="mb-6 rounded-xl bg-[#FEF3EC] border border-orange-100 px-5 py-4 transition-opacity duration-700"
            style={{ opacity: headerVisible ? 1 : 0 }}
          >
            <p className="text-sm text-orange-700">
              <span className="font-display italic font-semibold">Your course is ready</span>
              {" "}— five questions built this just for you. Start with Chapter 1.
            </p>
          </div>
        )}

        {/* Course header */}
        <div className="mb-6">
          <h1 className="font-display text-[32px] font-bold text-stone-900 leading-snug mb-1">
            {toTitleCase(course.topic)}
          </h1>
          <div className="flex items-center gap-3 text-sm text-stone-500">
            <span className="font-[family-name:var(--font-data)] text-xs">
              {chapters.length} chapters · ~{totalHours < 1 ? `${course.totalMinutes} min` : `${totalHours} hr`}
            </span>
            {streak > 0 && (
              <>
                <span className="text-stone-300">·</span>
                <span className="font-[family-name:var(--font-data)] text-xs font-semibold text-orange-700">
                  🔥 {streak} day{streak !== 1 ? "s" : ""} streak
                </span>
              </>
            )}
          </div>

          {/* Course progress bar */}
          {completedTotal > 0 && (
            <div className="mt-4 flex items-center gap-3">
              <div className="flex-1 h-1.5 bg-stone-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-orange-700 rounded-full transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="font-[family-name:var(--font-data)] text-[11px] text-stone-400 shrink-0">
                {pct}%
              </span>
            </div>
          )}
        </div>

        {/* Daily goal alert */}
        {course.daily_goal > 0 && !isNew && (
          <div className={`mb-8 rounded-xl px-5 py-3.5 border text-sm ${
            goalMet
              ? "bg-[#F2FAF5] border-[rgba(21,128,61,0.12)] text-[#1A5C36]"
              : "bg-[#FEF8EE] border-[rgba(194,65,12,0.12)] text-[#7A4A0A]"
          }`}>
            {goalMet ? (
              <p>
                <span className="font-display italic font-semibold">Goal met</span>
                {" "}— well done, that&apos;s real progress.
              </p>
            ) : remaining === 1 ? (
              <p>
                <span className="font-display italic font-semibold">One chapter</span>
                {" "}away from your goal today — whenever you&apos;re ready.
              </p>
            ) : (
              <p>
                <span className="font-display italic font-semibold">{remaining} chapters</span>
                {" "}to go today.{completedToday > 0 ? " You're making progress." : " Start whenever you're ready."}
              </p>
            )}
          </div>
        )}

        {/* Chapter list */}
        <div className="flex flex-col divide-y divide-stone-100">
          {chapters.length === 0 && (
            <p className="text-stone-400 py-6 text-sm">
              Open any chapter below to start — it generates in about 30 seconds.
            </p>
          )}

          {chapters.map((chapter, i) => {
            const isDone = completedIds.has(chapter.id);
            const delay = `${i * 40}ms`;

            return (
              <Link
                key={chapter.id}
                href={`/courses/${course.id}/chapters/${chapter.id}`}
                className={`flex items-center gap-4 py-4 group hover:bg-white hover:rounded-xl hover:px-4 hover:-mx-4 transition-all ${
                  isNew ? "chapter-reveal" : ""
                }`}
                style={isNew ? { animationDelay: delay } : {}}
              >
                {/* Chapter number */}
                <span className="font-[family-name:var(--font-data)] text-xs text-stone-300 w-6 shrink-0 text-right">
                  {chapter.chapter_index + 1}
                </span>

                {/* Chapter info */}
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-[15px] font-medium leading-snug truncate transition-colors ${
                      isDone
                        ? "text-stone-400 line-through decoration-stone-300"
                        : "text-stone-900 group-hover:text-orange-700"
                    }`}
                  >
                    {chapter.title}
                  </p>
                  <p className="font-[family-name:var(--font-data)] text-[11px] text-stone-400 mt-0.5">
                    {chapter.estimated_minutes} min
                  </p>
                </div>

                {/* Status indicator */}
                <span className="shrink-0 flex items-center">
                  {isDone ? (
                    <span className="w-5 h-5 rounded-full bg-[#F2FAF5] flex items-center justify-center text-green-700 text-xs">
                      ✓
                    </span>
                  ) : chapter.status === "generating" ? (
                    <span className="w-4 h-4 rounded-full border border-stone-300 border-t-amber-600 animate-spin inline-block" />
                  ) : chapter.status === "failed" ? (
                    <span className="text-xs text-red-500 font-medium">Retry</span>
                  ) : (
                    <span className="text-xs text-orange-700 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                      Open →
                    </span>
                  )}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
