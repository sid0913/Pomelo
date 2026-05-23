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
    const t = setTimeout(() => setHeaderVisible(false), 3000);
    return () => clearTimeout(t);
  }, [isNew]);

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-2xl mx-auto px-4 py-10">
        {/* Back link */}
        <Link
          href="/courses"
          className="inline-block text-sm text-stone-400 hover:text-stone-700 transition-colors mb-6"
        >
          ← My courses
        </Link>

        {/* Reveal header */}
        {headerVisible && (
          <div
            className="mb-6 rounded-lg bg-amber-50 border border-amber-100 px-4 py-3 transition-opacity duration-700"
            style={{ opacity: headerVisible ? 1 : 0 }}
          >
            <p className="text-sm font-medium text-amber-700">
              Your personalized course is ready.
            </p>
          </div>
        )}

        {/* Course header */}
        <h1 className="text-3xl font-bold text-stone-900 mb-1">{toTitleCase(course.topic)}</h1>
        <p className="text-sm text-stone-500 mb-6">
          {chapters.length} chapters · ~{course.totalMinutes} min total
        </p>

        {/* Habit + streak row */}
        <div className="mb-8 flex items-center justify-between text-sm text-stone-600">
          <span>
            Today&apos;s goal:{" "}
            <span className="font-medium text-stone-800">
              {completedToday} of {course.daily_goal} chapter
              {course.daily_goal !== 1 ? "s" : ""} completed
            </span>
          </span>
          {streak > 0 && (
            <span className="flex items-center gap-1 font-semibold text-amber-600">
              🔥 {streak} day{streak !== 1 ? "s" : ""} streak
            </span>
          )}
        </div>

        {/* Chapter list */}
        <div className="flex flex-col divide-y divide-stone-100">
          {chapters.length === 0 && (
            <p className="text-stone-400 py-4 text-sm">
              Open any chapter to start. It will generate in about 30 seconds.
            </p>
          )}

          {chapters.map((chapter, i) => {
            const isDone = completedIds.has(chapter.id);
            const delay = `${i * 40}ms`;

            return (
              <Link
                key={chapter.id}
                href={`/courses/${course.id}/chapters/${chapter.id}`}
                className={`flex items-center gap-4 py-4 group hover:bg-white hover:rounded-lg hover:px-3 hover:-mx-3 transition-all ${
                  isNew ? "chapter-reveal" : ""
                }`}
                style={isNew ? { animationDelay: delay } : {}}
              >
                <span className="text-sm font-medium text-stone-400 w-6 shrink-0">
                  {chapter.chapter_index + 1}
                </span>

                <div className="flex-1 min-w-0">
                  <p
                    className={`text-base font-medium leading-snug truncate ${
                      isDone ? "text-stone-400 line-through" : "text-stone-900"
                    }`}
                  >
                    {chapter.title}
                  </p>
                  <p className="text-xs text-stone-400 mt-0.5">
                    {chapter.estimated_minutes} min
                  </p>
                </div>

                <span className="shrink-0">
                  {isDone ? (
                    <span className="text-green-600 text-sm">✓</span>
                  ) : chapter.status === "generating" ? (
                    <span className="w-4 h-4 rounded-full border border-stone-300 border-t-amber-600 animate-spin inline-block" />
                  ) : chapter.status === "failed" ? (
                    <span className="text-xs text-red-500 font-medium">Retry</span>
                  ) : (
                    <span className="text-xs text-amber-600 font-medium group-hover:underline">
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
