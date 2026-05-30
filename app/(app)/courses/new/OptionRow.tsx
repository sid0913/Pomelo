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
        option-enter flex items-center gap-4 px-5 py-4 cursor-pointer select-none
        border transition-colors duration-100 outline-none
        ${selected
          ? "border-orange-700 bg-[#FEF3EC]"
          : "border-stone-200 bg-[#FFFDF5] hover:border-orange-200 hover:bg-[#FEF3EC]/40 [&:not(:last-child)]:border-b-0"
        }
        ${dimmed && !selected ? "opacity-50" : ""}
        first:rounded-t-lg last:rounded-b-lg
        focus-visible:ring-2 focus-visible:ring-orange-700 focus-visible:ring-offset-0
      `}
      style={{ animationDelay: `${staggerIndex * 80}ms` }}
    >
      <span
        className={`
          flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center
          font-[family-name:var(--font-data)] text-xs font-bold transition-colors duration-100
          ${selected
            ? "bg-orange-700 text-white"
            : "bg-[#F5F4EF] text-[#57534E]"
          }
        `}
      >
        {letter}
      </span>
      <span className={`text-sm leading-snug ${selected ? "text-[#9A3412] font-medium" : "text-[#57534E]"}`}>
        {text}
      </span>
    </div>
  );
}
