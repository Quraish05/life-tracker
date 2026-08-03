"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { streamChat, type ChatMessage, type ChatToolEvent } from "@/lib/chat";
import { useAiQuota } from "@/lib/use-ai-quota";
import { cn } from "@/lib/utils";
import { AccentText } from "@/components/ui/atoms/accent-text";
import { AiLimitNotice } from "@/components/ai/ai-quota";

/** A rendered turn — an assistant turn may carry the tools it ran. */
type Turn = ChatMessage & { tools?: ChatToolEvent[] };

const SUGGESTIONS = [
  "I had a Greek yogurt bowl for breakfast",
  "What did I eat today?",
  "Remind me to stretch at 6pm",
  "Log a 30 minute run",
];

/** Replace the last turn in a list via an updater — used to grow the streaming reply. */
function updateLast(turns: Turn[], fn: (t: Turn) => Turn): Turn[] {
  if (turns.length === 0) return turns;
  const copy = turns.slice();
  copy[copy.length - 1] = fn(copy[copy.length - 1]);
  return copy;
}

export default function ChatPage() {
  const queryClient = useQueryClient();
  const quota = useAiQuota();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<(() => void) | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  // Set while a turn runs at least one tool, so we refresh the app's data once.
  const ranToolRef = useRef(false);

  // Keep the newest message in view as the reply streams in.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [turns]);

  // Cancel any in-flight stream if the page unmounts.
  useEffect(() => () => abortRef.current?.(), []);

  function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || streaming || quota.exhausted) return;

    const history: Turn[] = [...turns, { role: "user", content: trimmed }];
    // Add an empty assistant turn that the stream fills in.
    setTurns([...history, { role: "assistant", content: "", tools: [] }]);
    setInput("");
    setError(null);
    setStreaming(true);
    ranToolRef.current = false;

    const payload: ChatMessage[] = history.map((t) => ({ role: t.role, content: t.content }));
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

    abortRef.current = streamChat(payload, timezone, {
      onText: (delta) =>
        setTurns((prev) => updateLast(prev, (t) => ({ ...t, content: t.content + delta }))),
      onTool: (event) => {
        ranToolRef.current = true;
        setTurns((prev) =>
          updateLast(prev, (t) => ({ ...t, tools: [...(t.tools ?? []), event] })),
        );
      },
      onDone: () => {
        setStreaming(false);
        // Every successful turn spends one AI credit — resync the quota badge.
        quota.refresh();
        // A tool changed the user's data — refresh anything the app is showing.
        if (ranToolRef.current) queryClient.invalidateQueries();
      },
      onError: (message) => {
        setStreaming(false);
        setError(message);
        // Keep the quota badge honest (e.g. after a 429 "pool exhausted").
        quota.refresh();
        // Drop the empty assistant bubble if nothing streamed into it.
        setTurns((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant" && !last.content && !(last.tools?.length))
            return prev.slice(0, -1);
          return prev;
        });
      },
    });
  }

  function stop() {
    abortRef.current?.();
    setStreaming(false);
  }

  const isEmpty = turns.length === 0;

  return (
    <div className="mx-auto flex h-[calc(100dvh-2rem)] max-w-3xl flex-col px-4 py-6 tablet:h-dvh tablet:px-6 tablet:py-8">
      <header className="flex-none">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
          Assistant
        </p>
        <h1 className="mt-1.5 text-2xl font-normal tracking-tight text-foreground tablet:text-3xl">
          Talk to your <AccentText tone="grape">tracker</AccentText>
        </h1>
      </header>

      {/* Thread */}
      <div ref={scrollRef} className="mt-5 flex-1 space-y-4 overflow-y-auto pr-1">
        {isEmpty ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <span className="text-4xl">💬</span>
            <p className="mt-3 max-w-sm text-sm text-muted">
              Ask me to log meals or workouts, set reminders, or look up your day —
              in plain language.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  disabled={quota.exhausted}
                  className="cursor-pointer rounded-full border border-border bg-surface px-3.5 py-1.5 text-sm text-foreground/80 transition hover:border-grape/40 hover:bg-grape/5 disabled:pointer-events-none disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          turns.map((turn, i) => <TurnBubble key={i} turn={turn} streaming={streaming && i === turns.length - 1} />)
        )}
      </div>

      {error && (
        <p className="mt-2 flex-none rounded-xl border border-coral/30 bg-coral/10 px-3 py-2 text-sm text-coral">
          {error}
        </p>
      )}

      {/* Composer */}
      <div className="mt-3 flex-none">
        {quota.exhausted && <AiLimitNotice className="mb-2" />}
        <div className="flex items-end gap-2 rounded-2xl border border-border bg-surface p-2 focus-within:border-grape">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            rows={1}
            disabled={quota.exhausted}
            placeholder={quota.exhausted ? "You're out of free AI actions" : "Message your tracker…"}
            aria-label="Message"
            className="max-h-40 min-h-9 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-foreground placeholder:text-muted/70 focus:outline-none disabled:opacity-60"
          />
          {streaming ? (
            <button
              type="button"
              onClick={stop}
              className="flex-none cursor-pointer rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground/70 transition hover:bg-grape/8"
            >
              Stop
            </button>
          ) : (
            <button
              type="button"
              onClick={() => send(input)}
              disabled={!input.trim() || quota.exhausted}
              className="flex-none cursor-pointer rounded-full bg-grape px-4 py-2 text-sm font-semibold text-on-accent transition hover:bg-grape-deep disabled:pointer-events-none disabled:opacity-50"
            >
              Send
            </button>
          )}
        </div>
        <p className="mt-1.5 px-1 text-[11px] text-muted">
          The assistant can log entries and set reminders in your account.
        </p>
      </div>
    </div>
  );
}

/** One message bubble — user (grape, right) or assistant (surface, left) + tool chips. */
function TurnBubble({ turn, streaming }: { turn: Turn; streaming: boolean }) {
  const isUser = turn.role === "user";
  const showTyping = streaming && !turn.content;

  return (
    <div className={cn("flex flex-col gap-1.5", isUser ? "items-end" : "items-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
          isUser
            ? "bg-grape text-on-accent"
            : "border border-border bg-surface text-foreground",
        )}
      >
        {showTyping ? (
          <TypingDots />
        ) : (
          <span className="whitespace-pre-wrap">{turn.content}</span>
        )}
      </div>

      {turn.tools && turn.tools.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {turn.tools.map((tool, i) => (
            <span
              key={i}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
                tool.ok
                  ? "bg-mint/50 text-ink"
                  : "bg-coral/15 text-coral",
              )}
            >
              <span aria-hidden>{tool.ok ? "✓" : "✕"}</span>
              {tool.summary}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/** Three pulsing dots shown before the assistant's first token arrives. */
function TypingDots() {
  return (
    <span className="flex items-center gap-1 py-0.5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </span>
  );
}
