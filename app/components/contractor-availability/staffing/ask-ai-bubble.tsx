import { useChat } from "@ai-sdk/react";
import { Affix, Loader, Textarea, Tooltip, Transition } from "@mantine/core";
import {
  IconArrowsMaximize,
  IconArrowsMinimize,
  IconArrowUp,
  IconChevronUp,
  IconMessagePlus,
  IconMinus,
  IconPlayerStopFilled,
  IconSparkles,
  IconX,
} from "@tabler/icons-react";
import { APICallError, DefaultChatTransport, type UIMessage } from "ai";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import type { Contractor } from "~/domains/contractor-availability/model";
import { DAILY_QUESTION_LIMIT, MAX_QUESTION_CHARS } from "~/domains/staffing-assistant/model";
import { cn } from "~/utils/utils";
import { FOCUS_RING } from "../constants";

// What each tool is doing, shown while it runs
const TOOL_STATUS: Record<string, string> = {
  findAvailable: "Checking availability…",
  contractorSchedules: "Looking up schedules…",
  listContractors: "Reading profiles…",
  monthSummary: "Adding up the month…",
};

// Panel size: "min" keeps only the header bar, "full" fills the window
type PanelSize = "normal" | "min" | "full";

const PANEL_SIZE: Record<PanelSize, string> = {
  normal: "absolute bottom-16 right-0 w-[min(420px,calc(100vw-32px))] h-[min(600px,calc(100vh-120px))]",
  min: "absolute bottom-16 right-0 w-[min(340px,calc(100vw-32px))]",
  full: "fixed inset-3 md:inset-6",
};

const HEADER_BUTTON = cn("grid place-items-center h-8 w-8 rounded-full hover:bg-white/15", FOCUS_RING);

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Contractor names in the answer become buttons that open the drawer
const useNameLinker = (contractors: Contractor[], onOpen: (email: string) => void) =>
  useMemo(() => {
    const byName = new Map<string, string>();
    contractors.forEach((c) => c.name && !byName.has(c.name) && byName.set(c.name, c.email));
    const names = [...byName.keys()].sort((a, b) => b.length - a.length);
    if (!names.length) return (text: string) => text;
    const pattern = new RegExp(`(${names.map(escapeRegExp).join("|")})`, "g");
    return (text: string) =>
      text.split(pattern).map((piece, i) => {
        const email = byName.get(piece);
        if (!email) return <Fragment key={i}>{piece}</Fragment>;
        return (
          <button
            key={i}
            type="button"
            onClick={() => onOpen(email)}
            className={cn(
              "font-semibold underline decoration-white/50 underline-offset-2 hover:decoration-white",
              FOCUS_RING
            )}
          >
            {piece}
          </button>
        );
      });
  }, [contractors, onOpen]);

// Paragraphs and "- " bullets; the prompt asks for nothing richer, and
// nothing is ever rendered as HTML
const Answer = ({ text, link }: { text: string; link: (t: string) => React.ReactNode }) => {
  const blocks: { bullets: boolean; lines: string[] }[] = [];
  for (const raw of text.split("\n")) {
    const line = raw.trimEnd();
    if (!line.trim()) continue;
    const bullet = /^\s*[-•*]\s+/.test(line);
    const content = line.replace(/^\s*[-•*]\s+/, "").replace(/\*\*/g, "");
    const last = blocks.at(-1);
    if (bullet && last?.bullets) last.lines.push(content);
    else blocks.push({ bullets: bullet, lines: [content] });
  }
  return (
    <div className="flex flex-col gap-2">
      {blocks.map((b, i) =>
        b.bullets ? (
          <ul key={i} className="list-disc pl-5 flex flex-col gap-1">
            {b.lines.map((l, j) => (
              <li key={j}>{link(l)}</li>
            ))}
          </ul>
        ) : (
          <p key={i}>{link(b.lines[0]!)}</p>
        )
      )}
    </div>
  );
};

const Message = ({ message, link }: { message: UIMessage; link: (t: string) => React.ReactNode }) => {
  if (message.role === "user") {
    const text = message.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
    return (
      <div className="self-end max-w-[85%] rounded-2xl rounded-br-md bg-white/15 px-3 py-2 whitespace-pre-wrap">
        {text}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      {message.parts.map((part, i) => {
        if (part.type === "text") return <Answer key={i} text={part.text} link={link} />;
        if (part.type.startsWith("tool-") && "state" in part && part.state !== "output-available") {
          const status = TOOL_STATUS[part.type.slice(5)] ?? "Working…";
          return (
            <div key={i} className="flex items-center gap-2 text-xs text-white/90">
              <Loader size={12} color="white" />
              {status}
            </div>
          );
        }
        return null;
      })}
    </div>
  );
};

/**
 * Floating "Ask AI" chat on the admin page. Answers come from the
 * staff-only ask route, which gives Claude read-only tools over the roster.
 */
export const AskAiBubble = ({
  contractors,
  onOpen,
}: {
  contractors: Contractor[];
  onOpen: (email: string) => void;
}) => {
  const [open, setOpen] = useState(false);
  const [size, setSize] = useState<PanelSize>("normal");
  const [input, setInput] = useState("");
  const transport = useMemo(() => new DefaultChatTransport({ api: "/api/contractor-availability/ask" }), []);
  const { messages, sendMessage, status, stop, error, setMessages, clearError } = useChat({ transport });
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const busy = status === "submitted" || status === "streaming";
  const link = useNameLinker(contractors, onOpen);

  const examples = useMemo(() => {
    const [a, b] = contractors.map((c) => c.name).filter(Boolean);
    return [
      "Who is available on March 3, May 11 and the week of June 15 for a full-day, in-person facilitation in NYC?",
      a && b
        ? `Check the availability for ${a} and ${b} for the next 3 months`
        : "How many TL days are booked this month?",
      "Who is willing to travel anywhere in the country and has no outside conflicts that would bar a 3 day/week coaching assignment?",
    ];
  }, [contractors]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, status]);

  useEffect(() => {
    if (open && size !== "min") inputRef.current?.focus();
  }, [open, size]);

  const ask = (text: string) => {
    const question = text.trim();
    if (!question || busy) return;
    clearError();
    sendMessage({ text: question });
    setInput("");
  };

  const newChat = () => {
    stop();
    clearError();
    setMessages([]);
    inputRef.current?.focus();
  };

  // Below Mantine's drawer (z 200), so a clicked name's profile opens on top
  return (
    <Affix position={{ bottom: 24, right: 24 }} zIndex={150}>
      <Transition mounted={open} transition="pop-bottom-right" duration={150}>
        {(styles) => (
          <section
            style={styles}
            role="dialog"
            aria-label="Ask AI about contractor availability"
            // Escape steps down from full screen first, then closes
            onKeyDown={(e) => e.key === "Escape" && (size === "full" ? setSize("normal") : setOpen(false))}
            className={cn(
              "flex flex-col rounded-[25px] bg-[#082040]/95 text-white text-sm shadow-[inset_0_0_0_1px_rgba(255,255,255,0.35),0_12px_40px_rgba(0,0,0,0.35)] backdrop-blur-md",
              PANEL_SIZE[size]
            )}
          >
            <header
              className={cn(
                "flex items-start justify-between gap-3 px-5 pt-4 pb-3",
                size === "min" ? "pb-4" : "border-b border-white/15"
              )}
            >
              <div className="min-w-0">
                <h2 className="text-base font-semibold flex items-center gap-1.5">
                  <IconSparkles size={18} aria-hidden /> Ask AI
                </h2>
                <p className="text-xs text-white/90 mt-0.5 truncate">
                  {size !== "min"
                    ? "Answers from the contractor data in Monday. Read-only."
                    : busy
                    ? "Answering…"
                    : messages.length
                    ? "Conversation kept. Expand to continue."
                    : "Read-only answers from Monday data."}
                </p>
              </div>
              <div className="flex gap-1 shrink-0">
                {size !== "min" && (
                  <Tooltip label="New chat" withArrow>
                    <button type="button" onClick={newChat} aria-label="New chat" className={HEADER_BUTTON}>
                      <IconMessagePlus size={18} />
                    </button>
                  </Tooltip>
                )}
                {size === "min" ? (
                  <Tooltip label="Expand" withArrow>
                    <button
                      type="button"
                      onClick={() => setSize("normal")}
                      aria-label="Expand"
                      className={HEADER_BUTTON}
                    >
                      <IconChevronUp size={18} />
                    </button>
                  </Tooltip>
                ) : (
                  <Tooltip label="Minimize" withArrow>
                    <button
                      type="button"
                      onClick={() => setSize("min")}
                      aria-label="Minimize"
                      className={HEADER_BUTTON}
                    >
                      <IconMinus size={18} />
                    </button>
                  </Tooltip>
                )}
                <Tooltip label={size === "full" ? "Exit full screen" : "Full screen"} withArrow>
                  <button
                    type="button"
                    onClick={() => setSize(size === "full" ? "normal" : "full")}
                    aria-label={size === "full" ? "Exit full screen" : "Full screen"}
                    className={HEADER_BUTTON}
                  >
                    {size === "full" ? <IconArrowsMinimize size={18} /> : <IconArrowsMaximize size={18} />}
                  </button>
                </Tooltip>
                <Tooltip label="Close" withArrow>
                  <button type="button" onClick={() => setOpen(false)} aria-label="Close" className={HEADER_BUTTON}>
                    <IconX size={18} />
                  </button>
                </Tooltip>
              </div>
            </header>

            {size !== "min" && (
              <>
                <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4" aria-live="polite">
                  <div className={cn("flex flex-col gap-4", size === "full" && "mx-auto max-w-3xl")}>
                    {messages.length === 0 && (
                      <div className="flex flex-col gap-2">
                        <p className="text-xs font-medium text-white/90">Try asking</p>
                        {examples.map((q) => (
                          <button
                            key={q}
                            type="button"
                            onClick={() => ask(q)}
                            className={cn(
                              "text-left rounded-2xl bg-white/[0.06] px-3 py-2 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.22)] hover:bg-white/15",
                              FOCUS_RING
                            )}
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    )}
                    {messages.map((m) => (
                      <Message key={m.id} message={m} link={link} />
                    ))}
                    {status === "submitted" && (
                      <div className="flex items-center gap-2 text-xs text-white/90">
                        <Loader size={12} color="white" /> Thinking…
                      </div>
                    )}
                    {error && (
                      <p role="alert" className="rounded-xl bg-red-900/60 px-3 py-2">
                        {APICallError.isInstance(error) && error.statusCode === 429
                          ? `You've asked ${DAILY_QUESTION_LIMIT} questions in the last 24 hours. Please try again later.`
                          : "Something went wrong getting an answer. Please try again."}
                      </p>
                    )}
                  </div>
                </div>

                <form
                  className={cn("flex items-end gap-2 px-4 pb-4 pt-2 w-full", size === "full" && "mx-auto max-w-3xl")}
                  onSubmit={(e) => {
                    e.preventDefault();
                    ask(input);
                  }}
                >
                  <Textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.currentTarget.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        ask(input);
                      }
                    }}
                    placeholder="Ask about availability, schedules or bookouts"
                    aria-label="Your question"
                    maxLength={MAX_QUESTION_CHARS}
                    autosize
                    minRows={1}
                    maxRows={4}
                    radius="lg"
                    className="flex-1"
                  />
                  {busy ? (
                    <button
                      type="button"
                      onClick={stop}
                      aria-label="Stop"
                      className={cn(
                        "grid place-items-center h-9 w-9 shrink-0 rounded-full bg-white text-[#082040]",
                        FOCUS_RING
                      )}
                    >
                      <IconPlayerStopFilled size={16} />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={!input.trim()}
                      aria-label="Ask"
                      className={cn(
                        "grid place-items-center h-9 w-9 shrink-0 rounded-full bg-white text-[#082040] disabled:opacity-60",
                        FOCUS_RING
                      )}
                    >
                      <IconArrowUp size={18} />
                    </button>
                  )}
                </form>
                <p
                  className={cn(
                    "px-5 pb-3 -mt-1 text-[11px] text-white/90 w-full",
                    size === "full" && "mx-auto max-w-3xl"
                  )}
                >
                  AI can make mistakes. Check the profile before booking anyone.
                </p>
              </>
            )}
          </section>
        )}
      </Transition>

      {/* Hidden in full screen, where it would sit on top of the Ask button */}
      <button
        type="button"
        hidden={open && size === "full"}
        onClick={() => {
          setSize("normal");
          setOpen((o) => !o);
        }}
        aria-expanded={open}
        aria-label={open ? "Close Ask AI" : "Ask AI about contractor availability"}
        className={cn(
          "flex items-center gap-2 h-12 rounded-full bg-[#082040]/85 pl-4 pr-5 text-white font-medium shadow-[inset_0_0_0_1px_rgba(255,255,255,0.35),0_8px_24px_rgba(0,0,0,0.3)] backdrop-blur-sm hover:bg-[#082040]",
          FOCUS_RING
        )}
      >
        {open ? <IconX size={20} /> : <IconSparkles size={20} />}
        Ask AI
      </button>
    </Affix>
  );
};
