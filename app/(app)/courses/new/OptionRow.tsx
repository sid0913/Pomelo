"use client";

import { useEffect, useRef } from "react";

interface OptionRowProps {
  letter: "A" | "B" | "C" | "D";
  text: string;
  selected: boolean;
  focused: boolean;
  dimmed: boolean;
  onSelect: () => void;
  onFocus: () => void;
  staggerIndex: number;
}

export function OptionRow({
  letter,
  text,
  selected,
  focused,
  dimmed,
  onSelect,
  onFocus,
  staggerIndex,
}: OptionRowProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (focused) ref.current?.focus();
  }, [focused]);

  return (
    <div
      ref={ref}
      role="radio"
      aria-checked={selected}
      aria-label={`Option ${letter}: ${text}`}
      tabIndex={focused ? 0 : -1}
      onClick={onSelect}
      onFocus={onFocus}
      onKeyDown={(e) => {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          onSelect();
        }
      }}
      className={`
        option-enter flex items-center gap-4 px-6 py-5 cursor-pointer select-none
        border transition-colors duration-100 outline-none
        ${selected
          ? "border-amber-600 bg-amber-50"
          : "border-stone-200 bg-white hover:border-amber-300 hover:bg-amber-50/50 [&:not(:last-child)]:border-b-0"
        }
        ${dimmed && !selected ? "opacity-50" : ""}
        first:rounded-t-lg last:rounded-b-lg
        focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-0
      `}
      style={{ animationDelay: `${staggerIndex * 80}ms` }}
    >
      {/* Letter badge */}
      <span
        className={`
          flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center
          text-xs font-bold font-mono transition-colors duration-100
          ${selected
            ? "bg-amber-600 text-white"
            : "bg-stone-100 text-stone-500 group-hover:text-amber-600"
          }
        `}
      >
        {letter}
      </span>
      <span className="text-sm text-stone-800 leading-snug">{text}</span>
    </div>
  );
}
