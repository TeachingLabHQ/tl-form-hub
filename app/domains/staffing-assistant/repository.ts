import { createAnthropic, type AnthropicLanguageModelOptions } from "@ai-sdk/anthropic";
import { SupabaseClient } from "@supabase/supabase-js";
import {
  type ToolSet,
  type UIMessage,
  convertToModelMessages,
  createUIMessageStreamResponse,
  isStepCount,
  streamText,
  toUIMessageStream,
} from "ai";
import { Errorable } from "~/utils/errorable";
import { Database } from "../../../supabase/database.types";
import { ASSISTANT_MODEL, QuestionLogEntry } from "./model";

export interface AnswerRequest {
  instructions: string;
  messages: UIMessage[];
  tools: ToolSet;
  headers: Headers;
  onEnd: (result: {
    toolsUsed: string[];
    inputTokens: number | null;
    outputTokens: number | null;
    finishReason: string;
  }) => Promise<void>;
  onError: (error: unknown) => Promise<void>;
}

export interface StaffingAssistantRepository {
  /** Streams Claude's answer as a UI message stream response for useChat. */
  streamAnswer(request: AnswerRequest): Promise<Errorable<Response>>;
  /** Records one question in staffing_assistant_questions. */
  logQuestion(entry: QuestionLogEntry): Promise<Errorable<null>>;
}

export function staffingAssistantRepository(
  supabase: SupabaseClient<Database>
): StaffingAssistantRepository {
  const streamAnswer = async ({
    instructions,
    messages,
    tools,
    headers,
    onEnd,
    onError,
  }: AnswerRequest): Promise<Errorable<Response>> => {
    // Read per call so the key never sits in module scope or the client bundle
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return { data: null, error: new Error("ANTHROPIC_API_KEY is not set") };
    try {
      const anthropic = createAnthropic({ apiKey });
      const result = streamText({
        model: anthropic(ASSISTANT_MODEL),
        instructions,
        messages: await convertToModelMessages(messages),
        tools,
        stopWhen: isStepCount(8),
        maxOutputTokens: 4000,
        providerOptions: {
          // Thinking is always on for this model; low keeps the bubble responsive
          anthropic: { effort: "low" } satisfies AnthropicLanguageModelOptions,
        },
        onEnd: ({ steps, usage, finishReason }) =>
          onEnd({
            toolsUsed: [...new Set(steps.flatMap((s) => s.toolCalls.map((c) => c.toolName)))],
            inputTokens: usage.inputTokens ?? null,
            outputTokens: usage.outputTokens ?? null,
            finishReason,
          }),
        onError: ({ error }) => onError(error),
      });
      return {
        data: createUIMessageStreamResponse({
          stream: toUIMessageStream({ stream: result.stream }),
          headers,
        }),
        error: null,
      };
    } catch (error) {
      return { data: null, error: error instanceof Error ? error : new Error(String(error)) };
    }
  };

  const logQuestion = async (entry: QuestionLogEntry): Promise<Errorable<null>> => {
    const { error } = await supabase.from("staffing_assistant_questions").insert({
      user_email: entry.userEmail,
      question: entry.question,
      tools_used: entry.toolsUsed,
      input_tokens: entry.inputTokens,
      output_tokens: entry.outputTokens,
      finish_reason: entry.finishReason,
      duration_ms: entry.durationMs,
      error: entry.error,
    });
    return error ? { data: null, error: new Error(error.message) } : { data: null, error: null };
  };

  return { streamAnswer, logQuestion };
}
