type ModelEnv = {
  DEEPSEEK_API_KEY?: string;
  DEEPSEEK_MODEL?: string;
  STORY_MODEL?: string;
  STORY_FALLBACK_MODEL?: string;
};

type StoryModelOptions = {
  stage?: "prompt1" | "prompt2" | "prompt3";
  validate?: (value: unknown) => boolean | { ok: boolean; reason?: string };
  primaryModel?: string;
  fallbackModel?: string;
  requestTimeoutMs?: number;
};

type Completion = { raw: string; finishReason?: string };

function stripCodeFence(raw: string) {
  const trimmed = raw.trim();
  const opening = trimmed.match(/^```(?:json)?\s*/i);
  if (!opening) return trimmed;
  return trimmed.slice(opening[0].length).replace(/\s*```\s*$/i, "").trim();
}

function jsonObjectCandidates(text: string) {
  const candidates: string[] = [];
  for (let start = 0; start < text.length; start += 1) {
    if (text[start] !== "{") continue;
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let index = start; index < text.length; index += 1) {
      const character = text[index];
      if (inString) {
        if (escaped) escaped = false;
        else if (character === "\\") escaped = true;
        else if (character === '"') inString = false;
        continue;
      }
      if (character === '"') inString = true;
      else if (character === "{") depth += 1;
      else if (character === "}") {
        depth -= 1;
        if (depth === 0) {
          candidates.push(text.slice(start, index + 1));
          start = index;
          break;
        }
      }
    }
  }
  return candidates;
}

export function parseModelJson(raw: string): unknown {
  const text = stripCodeFence(raw);
  if (!text) throw new Error("model_json_missing");

  let directError: unknown;
  try {
    return JSON.parse(text);
  } catch (error) {
    directError = error;
  }

  for (const candidate of jsonObjectCandidates(text)) {
    try {
      return JSON.parse(candidate);
    } catch {
      // Keep looking: a model may place a small JSON example before the real object.
    }
  }

  throw directError instanceof Error ? directError : new Error("model_json_invalid");
}

async function requestCompletion(
  apiKey: string,
  model: string,
  system: string,
  user: string,
  temperature: number,
  maxTokens: number,
  timeoutMs: number,
) {
  const makeRequest = async (jsonMode: boolean) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch("https://kaon-router.kaonai.com/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          model,
          messages: [{ role: "system", content: system }, { role: "user", content: user }],
          max_tokens: maxTokens,
          temperature,
          ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
        }),
      });
    } finally {
      clearTimeout(timeout);
    }
  };

  let response = await makeRequest(true);
  // Some OpenAI-compatible routers do not expose response_format for every model.
  if (response.status === 400 || response.status === 422) response = await makeRequest(false);
  if (!response.ok) throw new Error(`model_upstream_${response.status}`);

  const data = await response.json() as {
    choices?: Array<{ message?: { content?: string }; finish_reason?: string }>;
  };
  const choice = data.choices?.[0];
  return { raw: choice?.message?.content ?? "", finishReason: choice?.finish_reason } satisfies Completion;
}

function repairRequest(raw: string, parserError: string) {
  return {
    system: "你是严格的JSON语法修复器。只修复输入中的JSON语法、引号转义、逗号和未闭合结构；保留已有字段和语义，不写解释、代码围栏或额外文本，只输出一个合法JSON对象。",
    user: `解析错误：${parserError}\n待修复内容：\n${raw}`,
  };
}

export async function callStoryModel(
  system: string,
  user = "请严格执行并只输出JSON。",
  temperature = 0.65,
  maxTokens = 4000,
  options: StoryModelOptions = {},
) {
  const runtimeEnv = process.env as ModelEnv;
  const apiKey = runtimeEnv.DEEPSEEK_API_KEY || process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("missing_api_key");

  const primaryModel = options.primaryModel
    || runtimeEnv.STORY_MODEL
    || process.env.STORY_MODEL
    || runtimeEnv.DEEPSEEK_MODEL
    || "kaon/gemini-3.7-flash";
  const configuredFallback = options.fallbackModel || runtimeEnv.STORY_FALLBACK_MODEL || process.env.STORY_FALLBACK_MODEL;
  const fallbackModel = configuredFallback
    || (primaryModel === "kaon/gemini-3.7-flash" ? "kaon/deepseek-v4-flash" : "kaon/gemini-3.7-flash");
  const stage = options.stage ?? "prompt3";

  let lastError: unknown;
  let lastRaw = "";
  let lastFailure: "json_invalid" | "schema_invalid" | "request_failed" = "request_failed";
  const attempts = [
    { model: primaryModel, mode: "generate" as const },
    { model: primaryModel, mode: "recover" as const },
    { model: fallbackModel, mode: "generate" as const },
  ];

  for (let index = 0; index < attempts.length; index += 1) {
    const attempt = attempts[index];
    // A parseable Prompt 3 reply that fails the scene protocol should be
    // corrected by the same model with the exact reason. A different model is
    // useful for transport/format outages, but sending a schema failure into a
    // slow reasoning fallback adds latency and usually loses the good prose.
    if (stage === "prompt3" && attempt.model === fallbackModel && lastFailure === "schema_invalid") continue;
    // A transport failure or an empty model body has nothing that can be
    // repaired. Move straight to the alternate model instead of paying for a
    // second identical request that can only repeat the delay.
    if (
      attempt.mode === "recover"
      && (lastFailure === "request_failed" || (lastFailure === "json_invalid" && !lastRaw.trim()))
    ) continue;
    try {
      const repair = attempt.mode === "recover" && lastRaw && lastFailure === "json_invalid"
        ? repairRequest(lastRaw, lastError instanceof Error ? lastError.message : "invalid_json")
        : undefined;
      const completion = await requestCompletion(
        apiKey,
        attempt.model,
        repair?.system ?? system,
        repair?.user ?? (attempt.mode === "recover"
          ? `${user}\n上一次输出未通过${lastFailure === "schema_invalid" ? "结构与剧情协议" : "JSON"}校验：${lastError instanceof Error ? lastError.message : lastFailure}。请逐项修正后重新完整输出一个合法JSON对象。`
          : user),
        repair ? 0 : temperature,
        maxTokens,
        options.requestTimeoutMs ?? (stage === "prompt3" ? 35000 : 32000),
      );
      lastRaw = completion.raw;
      let parsed: unknown;
      try {
        parsed = parseModelJson(completion.raw);
      } catch (error) {
        lastError = error;
        lastFailure = "json_invalid";
        console.warn("[story-model] invalid JSON", {
          stage,
          model: attempt.model,
          attempt: index + 1,
          finishReason: completion.finishReason,
          rawLength: completion.raw.length,
          error: error instanceof Error ? error.message : String(error),
        });
        continue;
      }
      const validation = options.validate?.(parsed);
      const valid = typeof validation === "object" ? validation.ok : validation !== false;
      if (!valid) {
        const reason = typeof validation === "object" ? validation.reason : undefined;
        lastError = new Error(reason || "schema_invalid");
        lastFailure = "schema_invalid";
        console.warn("[story-model] invalid schema", { stage, model: attempt.model, attempt: index + 1, finishReason: completion.finishReason, reason });
        continue;
      }
      console.info("[story-model] success", { stage, model: attempt.model, attempt: index + 1, finishReason: completion.finishReason });
      return parsed;
    } catch (error) {
      lastError = error;
      lastFailure = "request_failed";
      console.warn("[story-model] request failed", { stage, model: attempt.model, attempt: index + 1, error: error instanceof Error ? error.message : String(error) });
    }
  }

  throw new Error(`${stage}_${lastFailure}${lastError instanceof Error ? `: ${lastError.message}` : ""}`);
}
