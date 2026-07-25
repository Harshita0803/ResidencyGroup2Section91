import type { ChatMessage } from "@/lib/types";

export function MessageBubble({ message }: { message: ChatMessage }) {
  if (message.role === "system") {
    return (
      <div className="animate-rise mx-auto my-1 max-w-[92%] rounded-lg bg-amber-50 px-3 py-2 text-center text-xs text-amber-800 ring-1 ring-amber-200">
        {message.text}
      </div>
    );
  }

  const isUser = message.role === "user";
  return (
    <div
      className={`animate-rise flex ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed shadow-sm ${
          isUser
            ? "rounded-br-md bg-brand text-white"
            : "rounded-bl-md bg-white text-ink ring-1 ring-black/5"
        }`}
      >
        {message.text}
      </div>
    </div>
  );
}
