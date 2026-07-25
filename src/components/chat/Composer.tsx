"use client";

import { useState } from "react";

export function Composer({
  disabled,
  placeholder,
  onSend,
}: {
  disabled: boolean;
  placeholder: string;
  onSend: (text: string) => void;
}) {
  const [value, setValue] = useState("");

  function submit() {
    const t = value.trim();
    if (!t || disabled) return;
    onSend(t);
    setValue("");
  }

  return (
    <div className="flex items-end gap-2">
      <textarea
        aria-label="Message"
        rows={1}
        value={value}
        disabled={disabled}
        placeholder={disabled ? "Use the options above to continue…" : placeholder}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        className="max-h-32 min-h-[44px] flex-1 resize-none rounded-2xl border border-black/10 bg-white px-4 py-3 text-[15px] outline-none placeholder:text-ink-soft/60 disabled:bg-black/5 disabled:text-ink-soft"
      />
      <button
        type="button"
        onClick={submit}
        disabled={disabled || !value.trim()}
        className="h-[44px] shrink-0 rounded-2xl bg-brand px-5 font-medium text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-40"
      >
        Send
      </button>
    </div>
  );
}
