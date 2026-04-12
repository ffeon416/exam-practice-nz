"use client";

import { useEffect, useRef, useState, KeyboardEvent } from "react";
// Note: onMessagesChange is invoked via a ref-stable wrapper so that parents
// passing inline arrow functions don't accidentally create a setState loop.

interface TutorChatProps {
  question: {
    id: string;
    text: string;
    markingGuide: string;
    expectedAnswer?: string;
  };
  studentAnswer?: string;
  initialMessages?: Message[];
  onMessagesChange?: (messages: Message[]) => void;
  onClose: () => void;
  /** Current tutor message usage count */
  tutorUsage?: number;
  /** Daily tutor message limit (-1 = unlimited) */
  tutorLimit?: number;
}

export interface Message {
  role: "user" | "assistant";
  content: string;
}

const INITIAL_ASSISTANT_MESSAGE: Message = {
  role: "assistant",
  content:
    "Hi! I'm here to help you work through this question. What's the first thing you notice about it?",
};

export default function TutorChat({
  question,
  studentAnswer,
  initialMessages,
  onMessagesChange,
  onClose,
  tutorUsage = 0,
  tutorLimit = -1,
}: TutorChatProps) {
  const isLimited = tutorLimit !== -1;
  const isOverLimit = isLimited && tutorUsage >= tutorLimit;
  const [messages, setMessages] = useState<Message[]>(
    initialMessages && initialMessages.length > 0
      ? initialMessages
      : [INITIAL_ASSISTANT_MESSAGE]
  );
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Keep the latest onMessagesChange in a ref so we can call it from inside
  // state-updater helpers without depending on its identity (which changes
  // every render when the parent passes an inline arrow function, which
  // would otherwise cause an infinite setState loop).
  const onMessagesChangeRef = useRef(onMessagesChange);
  useEffect(() => {
    onMessagesChangeRef.current = onMessagesChange;
  }, [onMessagesChange]);

  function emitMessages(next: Message[]) {
    onMessagesChangeRef.current?.(next);
  }

  // Auto-scroll to latest message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading || isOverLimit) return;

    const userMessage: Message = { role: "user", content: trimmed };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    emitMessages(nextMessages);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: {
            text: question.text,
            markingGuide: question.markingGuide,
            expectedAnswer: question.expectedAnswer,
          },
          messages: nextMessages,
          studentAnswer,
        }),
      });

      if (!res.ok) {
        throw new Error(`Tutor request failed (${res.status})`);
      }

      const data = (await res.json()) as { reply?: string; error?: string };
      if (!data.reply) {
        throw new Error(data.error ?? "No reply from tutor");
      }

      setMessages((prev) => {
        const updated: Message[] = [
          ...prev,
          { role: "assistant", content: data.reply as string },
        ];
        emitMessages(updated);
        return updated;
      });
    } catch (err) {
      console.error("Tutor chat error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
      // Refocus the textarea so the student can keep typing
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-end pointer-events-none"
      aria-modal="true"
      role="dialog"
    >
      {/* Backdrop (click to close) */}
      <button
        aria-label="Close tutor chat"
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto"
      />

      {/* Panel */}
      <div
        className="relative pointer-events-auto w-full sm:w-[420px] h-[85vh] sm:h-[80vh] sm:mr-6 sm:mb-0 mb-0 bg-zinc-900 border border-zinc-800 sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-900/95">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white font-semibold">
              AI
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">AI Tutor</h2>
              <p className="text-xs text-zinc-400">
                Here to help you think it through
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors p-1 rounded hover:bg-zinc-800"
            aria-label="Close"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-zinc-950/50"
        >
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-indigo-600 text-white rounded-br-sm"
                    : "bg-zinc-800 text-zinc-100 border border-zinc-700/60 rounded-bl-sm"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-zinc-800 border border-zinc-700/60 text-zinc-300 rounded-2xl rounded-bl-sm px-4 py-3 text-sm">
                <span className="inline-flex gap-1">
                  <span className="h-2 w-2 rounded-full bg-zinc-500 animate-pulse [animation-delay:0ms]" />
                  <span className="h-2 w-2 rounded-full bg-zinc-500 animate-pulse [animation-delay:150ms]" />
                  <span className="h-2 w-2 rounded-full bg-zinc-500 animate-pulse [animation-delay:300ms]" />
                </span>
              </div>
            </div>
          )}

          {error && (
            <div className="flex justify-start">
              <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-lg px-3 py-2 text-xs">
                {error}
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-zinc-800 bg-zinc-900 px-3 py-3">
          {isOverLimit && (
            <div className="mb-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[12px] text-amber-300">
              You&apos;ve used your {tutorLimit} free tutor messages for today. Upgrade to Student for 50/day or Pro for unlimited.{" "}
              <a href="/pricing" className="underline text-indigo-400 hover:text-indigo-300">View plans</a>
            </div>
          )}
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isOverLimit ? "Daily limit reached" : "Ask the tutor a question..."}
              rows={1}
              disabled={loading || isOverLimit}
              className="flex-1 resize-none bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-60 max-h-32"
            />
            <button
              onClick={sendMessage}
              disabled={loading || input.trim() === ""}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white rounded-xl p-2.5 transition-colors disabled:cursor-not-allowed"
              aria-label="Send message"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
          <p className="text-[10px] text-zinc-500 mt-1.5 px-1">
            Enter to send &middot; Shift + Enter for newline
          </p>
        </div>
      </div>
    </div>
  );
}
