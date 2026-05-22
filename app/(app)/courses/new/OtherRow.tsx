"use client";

import { useEffect, useRef } from "react";

interface OtherRowProps {
  selected: boolean;
  focused: boolean;
  onSelect: () => void;
  onFocus: () => void;
  value: string;
  onChange: (text: string) => void;
  onArrowUp: () => void;
  staggerIndex: number;
}

export function OtherRow({
  selected,
  focused,
  onSelect,
  onFocus,
  value,
  onChange,
  onArrowUp,
  staggerIndex,
}: OtherRowProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (selected) inputRef.current?.focus();
  }, [selected]);

  return (
    <div
      role="radio"
      aria-checked={selected}
      aria-label="Type your own answer"
      tabIndex={focused && !selected ? 0 : -1}
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
        border transition-colors duration-100 outline-none rounded-b-lg
        ${selected
          ? "border-amber-600 bg-amber-50"
          : "border-stone-200 bg-white hover:border-amber-300 hover:bg-amber-50/50 border-t-0"
        }
        focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-0
      `}
      style={{ animationDelay: `${staggerIndex * 80}ms` }}
    >
      <span
        className={`
          flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center
          text-xs font-bold font-mono transition-colors duration-100
          ${selected ? "bg-amber-600 text-white" : "bg-stone-100 text-stone-500"}
        `}
      >
        E
      </span>

      {selected ? (
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            if (e.key === "ArrowUp" && value === "") {
              e.preventDefault();
              onArrowUp();
            }
          }}
          placeholder="Type your answer…"
          className="flex-1 bg-transparent text-sm text-stone-800 placeholder:text-stone-400 outline-none min-w-0"
        />
      ) : (
        <span className="text-sm text-stone-500 italic">Type your own answer…</span>
      )}
    </div>
  );
}
