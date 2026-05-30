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
        option-enter flex items-center gap-4 px-5 py-4 cursor-pointer select-none
        border transition-colors duration-100 outline-none rounded-b-lg
        ${selected
          ? "border-orange-700 bg-[#FEF3EC]"
          : "border-stone-200 bg-[#FFFDF5] hover:border-orange-200 hover:bg-[#FEF3EC]/40 border-t-0"
        }
        focus-visible:ring-2 focus-visible:ring-orange-700 focus-visible:ring-offset-0
      `}
      style={{ animationDelay: `${staggerIndex * 80}ms` }}
    >
      <span
        className={`
          flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center border
          font-[family-name:var(--font-data)] text-xs font-bold transition-colors duration-100
          border-dashed
          ${selected
            ? "border-orange-700 text-orange-700 bg-[#FEF3EC]"
            : "border-stone-300 text-stone-400 bg-transparent"
          }
        `}
      >
        ↩
      </span>

      {selected ? (
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === "ArrowUp" && value === "") {
              e.preventDefault();
              onArrowUp();
            }
          }}
          placeholder="Type your answer…"
          className="flex-1 bg-transparent text-sm text-stone-800 placeholder:text-stone-400 outline-none min-w-0"
        />
      ) : (
        <span className="font-display text-sm italic text-[#A8A29E]">Type your own…</span>
      )}
    </div>
  );
}
