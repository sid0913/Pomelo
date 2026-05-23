import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { OtherRow } from "@/app/(app)/courses/new/OtherRow";

function makeProps(overrides: Partial<Parameters<typeof OtherRow>[0]> = {}) {
  return {
    selected: false,
    focused: false,
    onSelect: vi.fn(),
    onFocus: vi.fn(),
    value: "",
    onChange: vi.fn(),
    onArrowUp: vi.fn(),
    staggerIndex: 0,
    ...overrides,
  };
}

describe("OtherRow", () => {
  // ── Unselected state ───────────────────────────────────────
  it("renders italic placeholder text when not selected", () => {
    render(<OtherRow {...makeProps({ selected: false })} />);
    expect(screen.getByText("Type your own answer…")).toBeInTheDocument();
  });

  it("shows no text input when not selected", () => {
    render(<OtherRow {...makeProps({ selected: false })} />);
    expect(screen.queryByPlaceholderText("Type your answer…")).not.toBeInTheDocument();
  });

  it("has role=radio", () => {
    render(<OtherRow {...makeProps()} />);
    expect(screen.getByRole("radio")).toBeInTheDocument();
  });

  it("has aria-checked=false when not selected", () => {
    render(<OtherRow {...makeProps({ selected: false })} />);
    expect(screen.getByRole("radio")).toHaveAttribute("aria-checked", "false");
  });

  it("has aria-label='Type your own answer'", () => {
    render(<OtherRow {...makeProps()} />);
    expect(screen.getByRole("radio")).toHaveAttribute(
      "aria-label",
      "Type your own answer"
    );
  });

  // ── Selected state ─────────────────────────────────────────
  it("renders text input when selected", () => {
    render(<OtherRow {...makeProps({ selected: true })} />);
    expect(screen.getByPlaceholderText("Type your answer…")).toBeInTheDocument();
  });

  it("hides italic placeholder when selected", () => {
    render(<OtherRow {...makeProps({ selected: true })} />);
    expect(screen.queryByText("Type your own answer…")).not.toBeInTheDocument();
  });

  it("has aria-checked=true when selected", () => {
    render(<OtherRow {...makeProps({ selected: true })} />);
    expect(screen.getByRole("radio")).toHaveAttribute("aria-checked", "true");
  });

  it("shows current value in input", () => {
    render(<OtherRow {...makeProps({ selected: true, value: "custom answer" })} />);
    expect(screen.getByDisplayValue("custom answer")).toBeInTheDocument();
  });

  // ── Interactions ──────────────────────────────────────────
  it("calls onSelect when the container is clicked", () => {
    const onSelect = vi.fn();
    render(<OtherRow {...makeProps({ onSelect })} />);
    fireEvent.click(screen.getByRole("radio"));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("calls onFocus when the container is focused", () => {
    const onFocus = vi.fn();
    render(<OtherRow {...makeProps({ onFocus })} />);
    fireEvent.focus(screen.getByRole("radio"));
    expect(onFocus).toHaveBeenCalledTimes(1);
  });

  it("container Space key triggers onSelect", () => {
    const onSelect = vi.fn();
    render(<OtherRow {...makeProps({ onSelect })} />);
    fireEvent.keyDown(screen.getByRole("radio"), { key: " " });
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("container Enter key triggers onSelect", () => {
    const onSelect = vi.fn();
    render(<OtherRow {...makeProps({ onSelect })} />);
    fireEvent.keyDown(screen.getByRole("radio"), { key: "Enter" });
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("calls onChange when typing in the input", () => {
    const onChange = vi.fn();
    render(<OtherRow {...makeProps({ selected: true, onChange })} />);
    fireEvent.change(screen.getByPlaceholderText("Type your answer…"), {
      target: { value: "hello" },
    });
    expect(onChange).toHaveBeenCalledWith("hello");
  });

  it("ArrowUp on empty input calls onArrowUp", () => {
    const onArrowUp = vi.fn();
    render(
      <OtherRow {...makeProps({ selected: true, value: "", onArrowUp })} />
    );
    fireEvent.keyDown(screen.getByPlaceholderText("Type your answer…"), {
      key: "ArrowUp",
    });
    expect(onArrowUp).toHaveBeenCalledTimes(1);
  });

  it("ArrowUp on non-empty input does NOT call onArrowUp", () => {
    const onArrowUp = vi.fn();
    render(
      <OtherRow
        {...makeProps({ selected: true, value: "some text", onArrowUp })}
      />
    );
    fireEvent.keyDown(screen.getByPlaceholderText("Type your answer…"), {
      key: "ArrowUp",
    });
    expect(onArrowUp).not.toHaveBeenCalled();
  });

  it("clicking the input does not bubble click to container (no double onSelect)", () => {
    const onSelect = vi.fn();
    render(<OtherRow {...makeProps({ selected: true, onSelect })} />);
    // Click the input — stopPropagation should prevent container's onClick
    fireEvent.click(screen.getByPlaceholderText("Type your answer…"));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("tabIndex is 0 when focused and not selected", () => {
    render(<OtherRow {...makeProps({ focused: true, selected: false })} />);
    expect(screen.getByRole("radio")).toHaveAttribute("tabindex", "0");
  });

  it("tabIndex is -1 when selected (input takes over focus)", () => {
    render(<OtherRow {...makeProps({ focused: true, selected: true })} />);
    expect(screen.getByRole("radio")).toHaveAttribute("tabindex", "-1");
  });

  it("applies animationDelay from staggerIndex", () => {
    render(<OtherRow {...makeProps({ staggerIndex: 4 })} />);
    expect(screen.getByRole("radio")).toHaveStyle({ animationDelay: "320ms" });
  });
});
