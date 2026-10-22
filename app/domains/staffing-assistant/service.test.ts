import type { UIMessage } from "ai";
import { describe, expect, it, vi } from "vitest";
import { DAILY_QUESTION_LIMIT, MAX_CHAT_MESSAGES, MAX_QUESTION_CHARS } from "./model";
import type { AnswerRequest, StaffingAssistantRepository } from "./repository";
import {
  assistantInstructions,
  latestQuestion,
  QuestionLimitError,
  recentMessages,
  staffingAssistantService,
} from "./service";

const message = (role: "user" | "assistant", text: string, id = text): UIMessage => ({
  id,
  role,
  parts: [{ type: "text", text }],
});

const repository = () => {
  const repo = {
    streamAnswer: vi.fn(async (_: AnswerRequest) => ({ data: new Response("stream"), error: null })),
    logQuestion: vi.fn(async () => ({ data: null, error: null })),
    countQuestionsSince: vi.fn(async (_email: string, _since: string) => ({ data: 0, error: null })),
  } satisfies StaffingAssistantRepository;
  return repo;
};

const input = (messages: UIMessage[]) => ({
  messages,
  contractors: [],
  userEmail: "staff@teachinglab.org",
  headers: new Headers(),
  today: "2026-11-02",
});

describe("latestQuestion", () => {
  it("returns the last user message's text", () => {
    expect(latestQuestion([message("assistant", "Hi"), message("user", "  Who is free?  ")])).toBe("Who is free?");
  });

  it("rejects a missing, empty or too-long question", () => {
    expect(latestQuestion([message("user", "Q"), message("assistant", "A")])).toBeNull();
    expect(latestQuestion([message("user", "   ")])).toBeNull();
    expect(latestQuestion([message("user", "x".repeat(MAX_QUESTION_CHARS + 1))])).toBeNull();
  });
});

describe("recentMessages", () => {
  it("keeps the latest messages and starts on a user turn", () => {
    const chat = Array.from({ length: MAX_CHAT_MESSAGES + 5 }, (_, i) =>
      message(i % 2 ? "assistant" : "user", `m${i}`)
    );
    const recent = recentMessages(chat);
    expect(recent[0]!.role).toBe("user");
    expect(recent.at(-1)!.id).toBe(chat.at(-1)!.id);
    expect(recent.length).toBeLessThanOrEqual(MAX_CHAT_MESSAGES);
  });
});

describe("assistantInstructions", () => {
  it("dates the prompt and flags contractor-written text as data", () => {
    const text = assistantInstructions("2026-11-02");
    expect(text).toContain("Mon Nov 2, 2026");
    expect(text).toContain("contractorWrote");
  });

  it("defines the data's terms from the page's own thresholds", () => {
    const text = assistantInstructions("2026-11-02");
    expect(text).toContain("over 90 days ago");
    expect(text).toContain("80% of their monthly target");
    expect(text).toContain('"TL facilitation / coaching"');
  });
});

describe("staffingAssistantService.ask", () => {
  it("streams the answer with the read-only tools and logs the question on finish", async () => {
    const repo = repository();
    const result = await staffingAssistantService(repo).ask(input([message("user", "Who is free?")]));
    expect(result.error).toBeNull();
    const request = repo.streamAnswer.mock.calls[0]![0];
    expect(Object.keys(request.tools)).toContain("findAvailable");

    await request.onEnd({ toolsUsed: ["findAvailable"], inputTokens: 900, outputTokens: 120, finishReason: "stop" });
    expect(repo.logQuestion).toHaveBeenCalledWith(
      expect.objectContaining({
        userEmail: "staff@teachinglab.org",
        question: "Who is free?",
        toolsUsed: ["findAvailable"],
        inputTokens: 900,
        outputTokens: 120,
        finishReason: "stop",
        error: null,
      })
    );
  });

  it("logs a failed answer with its error", async () => {
    const repo = repository();
    await staffingAssistantService(repo).ask(input([message("user", "Who is free?")]));
    await repo.streamAnswer.mock.calls[0]![0].onError(new Error("overloaded"));
    expect(repo.logQuestion).toHaveBeenCalledWith(expect.objectContaining({ finishReason: "error", error: "overloaded" }));
  });

  it("doesn't call Claude without a valid question", async () => {
    const repo = repository();
    const result = await staffingAssistantService(repo).ask(input([message("user", "")]));
    expect(result.error).not.toBeNull();
    expect(repo.streamAnswer).not.toHaveBeenCalled();
  });

  it("keeps answering when the log write fails", async () => {
    const repo = repository();
    repo.logQuestion.mockResolvedValue({ data: null, error: new Error("RLS") } as never);
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    await staffingAssistantService(repo).ask(input([message("user", "Q")]));
    await expect(
      repo.streamAnswer.mock.calls[0]![0].onEnd({ toolsUsed: [], inputTokens: 1, outputTokens: 1, finishReason: "stop" })
    ).resolves.toBeUndefined();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("stops at the daily limit without calling Claude", async () => {
    const repo = repository();
    repo.countQuestionsSince.mockResolvedValue({ data: DAILY_QUESTION_LIMIT, error: null } as never);
    const result = await staffingAssistantService(repo).ask(input([message("user", "Q")]));
    expect(result.error).toBeInstanceOf(QuestionLimitError);
    expect(repo.streamAnswer).not.toHaveBeenCalled();
    const [email, since] = repo.countQuestionsSince.mock.calls[0]!;
    expect(email).toBe("staff@teachinglab.org");
    expect(Date.now() - Date.parse(since)).toBeCloseTo(24 * 60 * 60 * 1000, -4);
  });

  it("still answers when the question count can't be read", async () => {
    const repo = repository();
    repo.countQuestionsSince.mockResolvedValue({ data: null, error: new Error("no table") } as never);
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await staffingAssistantService(repo).ask(input([message("user", "Q")]))).error).toBeNull();
    expect(repo.streamAnswer).toHaveBeenCalled();
    spy.mockRestore();
  });
});
