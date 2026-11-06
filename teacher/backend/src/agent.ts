import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { ApiError, object, type Obj } from "./tools.js";
export function configuration(env: NodeJS.ProcessEnv) {
  let url: URL;
  try {
    url = new URL(env.AI_BASE_URL || "https://api.openai.com/v1");
  } catch {
    throw new ApiError(503, "Set a valid AI_BASE_URL.");
  }
  const local = [
    "localhost",
    "127.0.0.1",
    "[::1]",
    "host.docker.internal",
    "ollama",
  ].includes(url.hostname);
  const valid =
    ["http:", "https:"].includes(url.protocol) &&
    !url.username &&
    !url.password;
  return {
    configured: !!env.AI_MODEL && valid && !!(env.AI_API_KEY || local),
    model: env.AI_MODEL || "",
    base: url.toString().replace(/\/$/, ""),
    tools: { youtube: !!env.YOUTUBE_API_KEY, web: false },
  };
}
export async function runAgent({
  systemPrompt,
  history,
  tools,
  runTool,
  toolBudget = 12,
  env,
  output,
  deduplicateTool,
  repairInstructions,
  fatalToolErrors = false,
}: {
  systemPrompt: string;
  history: Obj[];
  tools: Obj[];
  runTool: (
    name: string,
    args: unknown,
    signal: AbortSignal,
  ) => Promise<unknown>;
  toolBudget?: number;
  env: NodeJS.ProcessEnv;
  output: Obj;
  deduplicateTool?: string;
  repairInstructions?: string;
  fatalToolErrors?: boolean;
}) {
  const cfg = configuration(env);
  if (!cfg.configured)
    throw new ApiError(
      503,
      "AI is not configured. Set server AI_MODEL and AI_API_KEY, or AI_MODEL and a local AI_BASE_URL.",
    );
  const messages: Obj[] = [
    { role: "system", content: systemPrompt },
    ...history,
  ];
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120000);
  let turns = 0,
    toolCount = 0;
  let pending: Obj[] = [];
  let forceFinal = false;
  const completedArtifacts = new Map<string, Obj>();
  const State = Annotation.Root({
    done: Annotation<boolean>({ reducer: (_, v) => v, default: () => false }),
  });
  const graph = new StateGraph(State)
    .addNode("model", async () => {
      if (++turns > 7)
        throw new ApiError(
          502,
          "Assistant exceeded its tool budget. Try a narrower request.",
        );
      const r = await fetch(`${cfg.base}/chat/completions`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(env.AI_API_KEY
            ? { authorization: `Bearer ${env.AI_API_KEY}` }
            : {}),
        },
        body: JSON.stringify({
          model: cfg.model,
          messages,
          tools,
          tool_choice: forceFinal ? "none" : "auto",
          temperature: 0.3,
          max_tokens: Math.min(
            32000,
            Math.max(1000, Number(env.AI_MAX_TOKENS) || 8000),
          ),
        }),
        signal: controller.signal,
      });
      if (!r.ok)
        throw new ApiError(
          502,
          `Model provider returned HTTP ${r.status}. Check server model settings.`,
        );
      const raw = await boundedText(r, 1_000_000);
      let data: Obj;
      try {
        data = JSON.parse(raw);
      } catch {
        throw new ApiError(502, "Model provider returned invalid JSON.");
      }
      if (data.choices?.[0]?.finish_reason === "length")
        throw new ApiError(
          502,
          "Model reached its token limit before finishing. Increase server AI_MAX_TOKENS or ask for a shorter lesson.",
        );
      const m = data.choices?.[0]?.message;
      if (!object(m) || m.role !== "assistant")
        throw new ApiError(502, "Model provider returned an invalid message.");
      pending = m.tool_calls ?? [];
      if (!Array.isArray(pending) || pending.length > 8)
        throw new ApiError(502, "Model returned too many tool calls.");
      if (pending.length) {
        messages.push({
          role: "assistant",
          content: typeof m.content === "string" ? m.content : null,
          tool_calls: pending,
        });
        return { done: false };
      }
      if (
        typeof m.content !== "string" ||
        !m.content.trim() ||
        m.content.length > 40000
      )
        throw new ApiError(
          502,
          "Model returned an empty or oversized response.",
        );
      output.message = m.content;
      return { done: true };
    })
    .addNode("tools", async () => {
      for (const call of pending) {
        if (++toolCount > toolBudget)
          throw new ApiError(
            502,
            "Assistant exceeded its tool budget. Try a narrower request.",
          );
        if (
          !object(call) ||
          typeof call.id !== "string" ||
          call.id.length > 200 ||
          !object(call.function) ||
          typeof call.function.name !== "string" ||
          typeof call.function.arguments !== "string" ||
          call.function.arguments.length > 60000
        )
          throw new ApiError(502, "Model returned an invalid tool call.");
        const name = call.function.name;
        let result;
        try {
          const args = JSON.parse(call.function.arguments);
          const signature = JSON.stringify(args);
          if (name === deduplicateTool && completedArtifacts.has(signature)) {
            const saved = completedArtifacts.get(signature)!;
            result = {
              kind: saved.kind,
              title: saved.title,
              alreadyCreated: true,
              guidance: `This identical ${saved.kind === "lesson" ? "lesson" : "artifact"} already exists in the response cards. Finish your final answer now; no further tools are available.`,
            };
            forceFinal = true;
          } else {
            output.trace.push(name);
            result = await runTool(name, args, controller.signal);
            if (name === deduplicateTool)
              completedArtifacts.set(signature, result as Obj);
          }
        } catch (err) {
          if (fatalToolErrors && err instanceof ApiError && err.status === 502)
            throw err;
          const reason =
            err instanceof ApiError
              ? err.message
              : "Tool unavailable or arguments invalid.";
          output.warnings.push(`${name}: ${reason}`);
          result = {
            error: reason,
            ...(name === deduplicateTool ? { repairInstructions } : {}),
          };
        }
        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify(result).slice(0, 100000),
        });
      }
      return { done: false };
    })
    .addEdge(START, "model")
    .addConditionalEdges("model", (s) => (s.done ? "end" : "tools"), {
      end: END,
      tools: "tools",
    })
    .addEdge("tools", "model")
    .compile();
  try {
    await graph.invoke({ done: false }, { recursionLimit: 20 });
    return output;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(
      502,
      controller.signal.aborted
        ? "Model request timed out. Try again."
        : "Model connection failed. Check AI_BASE_URL, AI_MODEL and provider availability.",
    );
  } finally {
    clearTimeout(timeout);
  }
}
export async function boundedText(response: Response, max: number) {
  if (Number(response.headers.get("content-length")) > max)
    throw new ApiError(502, "Upstream response too large.");
  const reader = response.body?.getReader();
  if (!reader) return "";
  let size = 0;
  const parts: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > max) {
      await reader.cancel();
      throw new ApiError(502, "Upstream response too large.");
    }
    parts.push(value);
  }
  return Buffer.concat(parts).toString("utf8");
}
