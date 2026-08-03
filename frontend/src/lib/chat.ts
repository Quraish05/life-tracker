import { API_ORIGIN, API_V1_PREFIX, tokenStore } from "@/lib/api";

/** A single chat turn. Mirrors the backend `ChatMessage`. */
export type ChatMessage = { role: "user" | "assistant"; content: string };

/** One tool the assistant ran during a turn — rendered as a chip in the thread. */
export type ChatToolEvent = { name: string; summary: string; ok: boolean };

/** Server-Sent frames the backend emits (see `services/chat.py`). */
type ChatFrame =
  | { type: "text"; text: string }
  | { type: "tool"; name: string; summary: string; ok: boolean }
  | { type: "done" }
  | { type: "error"; message: string };

/** Callbacks driven by the stream; all optional. */
type StreamHandlers = {
  /** A chunk of the assistant's reply text. */
  onText: (delta: string) => void;
  /** A tool finished running. */
  onTool: (event: ChatToolEvent) => void;
  /** The turn completed cleanly. */
  onDone: () => void;
  /** The turn failed (network, quota, or an in-stream error frame). */
  onError: (message: string, status?: number) => void;
};

/**
 * POST the conversation to `/chat` and stream the assistant's reply.
 *
 * Uses `fetch` + a `ReadableStream` reader (not `EventSource`, which can't POST
 * or send an auth header) to parse the Server-Sent Events. Returns an `abort`
 * function so the caller can cancel an in-flight turn. Errors are delivered
 * through `onError` — this never throws.
 */
export function streamChat(
  messages: ChatMessage[],
  timezone: string,
  handlers: StreamHandlers,
): () => void {
  const controller = new AbortController();

  (async () => {
    let res: Response;
    try {
      res = await fetch(`${API_ORIGIN}${API_V1_PREFIX}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenStore.get() ?? ""}`,
        },
        body: JSON.stringify({ messages, timezone }),
        signal: controller.signal,
      });
    } catch {
      handlers.onError("Can't reach the server. Please try again.");
      return;
    }

    if (!res.ok || !res.body) {
      // Read the JSON error body for a useful message (quota, provider, etc.).
      let detail = "The assistant is unavailable right now.";
      try {
        const data = await res.json();
        if (typeof data?.detail === "string") detail = data.detail;
      } catch {
        /* non-JSON body — keep the default */
      }
      handlers.onError(detail, res.status);
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // SSE frames are separated by a blank line; a frame's payload is its
        // `data:` lines. Process every complete frame the buffer now holds.
        let sep: number;
        while ((sep = buffer.indexOf("\n\n")) !== -1) {
          const raw = buffer.slice(0, sep);
          buffer = buffer.slice(sep + 2);
          const payload = raw
            .split("\n")
            .filter((line) => line.startsWith("data:"))
            .map((line) => line.slice(5).trim())
            .join("");
          if (!payload) continue;

          let frame: ChatFrame;
          try {
            frame = JSON.parse(payload) as ChatFrame;
          } catch {
            continue; // ignore a malformed frame rather than kill the stream
          }

          if (frame.type === "text") handlers.onText(frame.text);
          else if (frame.type === "tool")
            handlers.onTool({ name: frame.name, summary: frame.summary, ok: frame.ok });
          else if (frame.type === "done") handlers.onDone();
          else if (frame.type === "error") handlers.onError(frame.message);
        }
      }
    } catch {
      // A user-initiated abort surfaces here; treat any read failure as a quiet stop.
      if (!controller.signal.aborted) {
        handlers.onError("The connection dropped mid-reply. Please try again.");
      }
    }
  })();

  return () => controller.abort();
}
