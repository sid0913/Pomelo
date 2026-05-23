import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { OptionRow } from "@/app/(app)/courses/new/OptionRow";

function makeProps(overrides: Partial<Parameters<typeof OptionRow>[0]> = {}) {
  return {
    letter: "A" as const,
    text: "Complete beginner",
    selected: false,
    focused: false,
    dimmed: false,
    onSelect: vi.fn(),
    onFocus: vi.fn(),
    staggerIndex: 0,
    ...overrides,
  };
}

describe("OptionRow", () => {
  it("renders letter badge and option text", () => {
    render(<OptionRow {...makeProps()} />);
    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.getByText("Complete beginner")).toBeInTheDocument();
  });

  it("has role=radio and aria-checked=false when not selected", () => {
    render(<OptionRow {...makeProps({ selected: false })} />);
    const el = screen.getByRole("radio");
    expect(el).toHaveAttribute("aria-checked", "false");
  });

  it("has aria-checked=true when selected", () => {
    render(<OptionRow {...makeProps({ selected: true })} />);
    expect(screen.getByRole("radio")).toHaveAttribute("aria-checked", "true");
  });

  it("aria-label includes letter and text", () => {
    render(<OptionRow {...makeProps({ letter: "B", text: "Some experience" })} />);
    expect(screen.getByRole("radio")).toHaveAttribute(
      "aria-label",
      "Option B: Some experience"
    );
  });

  it("calls onSelect when clicked", () => {
    const onSelect = vi.fn();
    render(<OptionRow {...makeProps({ onSelect })} />);
    fireEvent.click(screen.getByRole("radio"));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("calls onFocus when focused", () => {
    const onFocus = vi.fn();
    render(<OptionRow {...makeProps({ onFocus })} />);
    fireEvent.focus(screen.getByRole("radio"));
    expect(onFocus).toHaveBeenCalledTimes(1);
  });

  it("calls onSelect on Space key", () => {
    const onSelect = vi.fn();
    render(<OptionRow {...makeProps({ onSelect })} />);
    fireEvent.keyDown(screen.getByRole("radio"), { key: " " });
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("calls onSelect on Enter key", () => {
    const onSelect = vi.fn();
    render(<OptionRow {...makeProps({ onSelect })} />);
    fireEvent.keyDown(screen.getByRole("radio"), { key: "Enter" });
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("does NOT call onSelect on other keys", () => {
    const onSelect = vi.fn();
    render(<OptionRow {...makeProps({ onSelect })} />);
    fireEvent.keyDown(screen.getByRole("radio"), { key: "Tab" });
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("tabIndex is 0 when focused, -1 otherwise", () => {
    const { rerender } = render(<OptionRow {...makeProps({ focused: false })} />);
    expect(screen.getByRole("radio")).toHaveAttribute("tabindex", "-1");
    rerender(<OptionRow {...makeProps({ focused: true })} />);
    expect(screen.getByRole("radio")).toHaveAttribute("tabindex", "0");
  });

  it("applies animationDelay based on staggerIndex", () => {
    render(<OptionRow {...makeProps({ staggerIndex: 3 })} />);
    expect(screen.getByRole("radio")).toHaveStyle({ animationDelay: "240ms" });
  });
});
