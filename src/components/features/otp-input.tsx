"use client";

import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

/**
 * A one-time-code field: one box per digit.
 *
 * The value is a string of up to `length` digits with no gaps. Typing moves
 * forward, backspace moves back, and pasting a whole code fills every box.
 */
export function OtpInput({
  value,
  onChange,
  onComplete,
  length = 6,
  disabled,
  invalid,
  autoFocus,
}: {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  length?: number;
  disabled?: boolean;
  invalid?: boolean;
  autoFocus?: boolean;
}) {
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  // Focus moves to the next box before React re-renders with the new value,
  // so handlers read the code from here rather than from the `value` prop.
  const latest = useRef(value);

  useEffect(() => {
    latest.current = value;
  }, [value]);

  function focusBox(index: number) {
    const target = inputs.current[Math.max(0, Math.min(length - 1, index))];
    target?.focus();
    target?.select();
  }

  function commit(next: string) {
    const digits = next.replace(/\D/g, "").slice(0, length);
    latest.current = digits;
    onChange(digits);
    if (digits.length === length) onComplete?.(digits);
    return digits;
  }

  /** Writes `typed` starting at box `index`, overwriting what was there. */
  function writeAt(index: number, typed: string) {
    const current = latest.current;
    const start = Math.min(index, current.length);
    const digits = commit(
      current.slice(0, start) + typed + current.slice(start + typed.length),
    );
    focusBox(Math.min(start + typed.length, digits.length));
  }

  return (
    <div
      className="flex justify-center gap-2"
      role="group"
      aria-label="Verification code"
    >
      {Array.from({ length }, (_, index) => (
        <input
          key={index}
          ref={(element) => {
            inputs.current[index] = element;
          }}
          value={value[index] ?? ""}
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          aria-label={`Digit ${index + 1}`}
          aria-invalid={invalid || undefined}
          autoFocus={autoFocus && index === 0}
          disabled={disabled}
          maxLength={length}
          onFocus={(event) => {
            // No gaps: clicking past the end lands on the next empty box.
            if (index > latest.current.length) focusBox(latest.current.length);
            else event.currentTarget.select();
          }}
          onChange={(event) => {
            const existing = latest.current[index];
            let typed = event.target.value.replace(/\D/g, "");
            if (!typed) return;
            // Typing into a filled box yields old + new digit: keep the new one.
            if (existing && typed.length === 2) {
              typed = typed.replace(existing, "");
            }
            // Anything longer than one digit is autofill from the email.
            writeAt(index, typed);
          }}
          onPaste={(event) => {
            event.preventDefault();
            const pasted = event.clipboardData
              .getData("text")
              .replace(/\D/g, "");
            if (!pasted) return;
            const digits = commit(pasted);
            focusBox(digits.length);
          }}
          onKeyDown={(event) => {
            const current = latest.current;
            if (event.key === "Backspace") {
              event.preventDefault();
              if (current[index]) {
                commit(current.slice(0, index) + current.slice(index + 1));
              } else if (index > 0) {
                commit(current.slice(0, index - 1) + current.slice(index));
                focusBox(index - 1);
              }
            } else if (event.key === "ArrowLeft") {
              event.preventDefault();
              focusBox(index - 1);
            } else if (event.key === "ArrowRight") {
              event.preventDefault();
              focusBox(Math.min(index + 1, current.length));
            }
          }}
          className={cn(
            "size-11 rounded-lg border border-input bg-background text-center font-mono text-lg font-semibold outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 dark:bg-input/30 sm:size-12",
            invalid && "border-destructive ring-3 ring-destructive/20",
          )}
        />
      ))}
    </div>
  );
}
