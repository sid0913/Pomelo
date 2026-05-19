"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function NewCourseForm() {
  const [topic, setTopic] = useState("");
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = topic.trim();
    if (!trimmed) return;
    router.push(`/courses/new?topic=${encodeURIComponent(trimmed)}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        placeholder="What do you want to learn next?"
        className="flex-1 rounded-lg border border-stone-200 bg-white px-4 py-2.5 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
        required
        minLength={2}
        maxLength={200}
        autoFocus
      />
      <button
        type="submit"
        disabled={!topic.trim()}
        className="shrink-0 rounded-lg bg-amber-600 px-4 py-2.5 text-sm text-white font-semibold hover:bg-amber-700 transition-colors disabled:opacity-40"
      >
        New course →
      </button>
    </form>
  );
}
