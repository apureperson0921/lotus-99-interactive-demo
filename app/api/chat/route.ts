import type { Message } from "../../story-data";
import { callStoryModel } from "../../model-client";
import { buildRuntimePacket, currentArcPhase, runtimePolicyIssue, validateAndNormalizeTurn, visibleCharacterIds } from "../../workflow-policy";
import { prompt3 } from "../../workflow-prompts";
import { chapterProgressionRule, commitRuntimeWorkflow, getWorkflow } from "../../workflow-store";
import { openWorkflowToken, sealWorkflow } from "../../workflow-token";
import type {
  ChapterClueReward,
  ChapterClueRewardDefinition,
  ChapterCompletePayload,
  PlayerInputKind,
  RuntimePackage,
  RuntimeSegment,
  StoryPackage,
} from "../../workflow-contract";

const playerInputKinds = new Set<PlayerInputKind>(["action", "speech", "freeform", "identity"]);

const fallbackDialogue: Record<string, string> = {
  erin: "好。先把眼前这一步做实，别替任何人抢着下结论。",
  harold: "可以继续，但把证据和猜测分开。我们只处理已经看见的东西。",
  miller: "行。至少这个办法比盯着坏像素祈祷靠谱。",
  ward: "你们可以接着问。答案愿不愿意出现，是另一回事。",
  maya: "这次先听我说完。别急着替我决定这件事意味着什么。",
  daniel: "慢一点。这里最容易骗人的，往往是你最想相信的那部分。",
};

/** Canon-safe fallback used only when a model reply cannot safely advance state. */
function canonicalFallbackCandidate(runtime: RuntimePackage, segment: RuntimeSegment, inputKind: PlayerInputKind) {
  const phase = currentArcPhase(runtime, segment);
  const plotUnlocked = runtime.state.social_beats_in_segment >= segment.tempo_budget.min_social_beats_before_plot_advance;
  const eligibleMaterials = plotUnlocked
    ? segment.materials.filter((material) => segment.allowed_material_ids.includes(material.id)
      && !runtime.state.used_material_ids.includes(material.id))
    : [];
  const approvedMaterial = phase === "转"
    ? eligibleMaterials[0]
    : phase === "合"
      ? eligibleMaterials[eligibleMaterials.length - 1]
      : undefined;
  const first = segment.present[0];
  const second = segment.present[1] ?? first;
  const third = segment.present[2] ?? second;
  const acknowledgement = inputKind === "identity"
    ? "你说明了自己准备以什么身份加入。屋里的人各自看了你一眼，态度不完全一样，但没人再把你当作路过的人。"
    : "你的选择让争论停了一拍。现场没有继续兜圈子，几个人开始把话变成下一步。";
  const movement = approvedMaterial?.detail
    ?? "桌上的记录被重新排开。有人核对眼前的细节，有人盯着其他人的反应，现场往前挪了一小步。";

  if (approvedMaterial?.id === "m_ch02_s03_song") {
    return {
      events: [
        { type: "narration", text: acknowledgement },
        { type: "action", person: "erin", text: "螺丝被拧出半寸。隔板后先响起一声电流爆音，早已断电的壁挂旧音响随即断断续续放出一段带留声机杂音的乡村吉他旋律。艾琳的手电光猛地晃开，整个人僵在原地。" },
        { type: "dialogue", person: "erin", text: "那是丹尼尔八岁时在吉他上创作的，除了我和他没人知道。" },
        { type: "reaction", person: "miller", text: "米勒脸上的玩笑彻底没了。他先看向通道，再看向艾琳，没有急着否定她。" },
      ],
      choices: [
        { kind: "action", text: "陪艾琳追向通道" },
        { kind: "speech", text: "先让米勒记下声音" },
      ],
    };
  }

  if (approvedMaterial?.id === "m_ch02_s03_disguise_plan") {
    return {
      events: [
        { type: "narration", text: acknowledgement },
        { type: "action", person: "erin", text: "通道尽头的人影已经消失，艾琳仍要往侧门追。米勒横过一步，硬把她拦了下来。" },
        { type: "dialogue", person: "miller", text: "他妈是圈套！今晚到此为止，真想混进内场，我会找我傻逼二次元兄弟借一些Cosplay衣服，换了再来。" },
        { type: "dialogue", person: "erin", text: "……你居然真有这种朋友。" },
      ],
      choices: [
        { kind: "speech", text: "让米勒现在就去借" },
        { kind: "action", text: "先把今晚的线索带走" },
      ],
    };
  }

  if (approvedMaterial?.id === "m_ch05_s01_erin_song_memory") {
    return {
      events: [
        { type: "narration", text: acknowledgement },
        { type: "dialogue", person: "erin", text: "丹尼尔八岁那年，整条街停电。他抱着一把少了两根弦的旧吉他，对着电池录音机弹了一晚上。不是为了写歌。他只是觉得，屋里有声音，别人就不会那么害怕。" },
        { type: "reaction", person: "miller", text: "米勒没有插科打诨。他低头看着那篇论文，等艾琳自己决定还要说多少。" },
        { type: "dialogue", person: "harold", text: "这解释了他为什么会留下。但还没解释，为什么所有人都该承担他的选择。" },
      ],
      choices: [
        { kind: "speech", text: "让艾琳把故事讲完" },
        { kind: "speech", text: "问哈罗德他在怕什么" },
      ],
    };
  }

  if (approvedMaterial?.id === "m_ch05_s01_erin_pattern") {
    return {
      events: [
        { type: "narration", text: acknowledgement },
        { type: "dialogue", person: "erin", text: "他后来总在码头喂那只黑猫，也总把别人扔掉的坏东西带回家修。他最受不了的，是看见一个人在难受，自己却什么都做不了。Lotus让他以为，这次他终于能把所有东西修好。" },
        { type: "dialogue", person: "miller", text: "所以他不是不爱外面的人。他是受不了爱一个人，还救不了他。" },
        { type: "dialogue", person: "erin", text: "对。理解他，不等于我同意他。" },
      ],
      choices: [
        { kind: "speech", text: "问艾琳她想救哪一个他" },
        { kind: "speech", text: "让哈罗德回应这段过去" },
      ],
    };
  }

  if (approvedMaterial?.id === "m_ch05_s01_harold_argument") {
    return {
      events: [
        { type: "narration", text: acknowledgement },
        { type: "dialogue", person: "harold", text: "我以前拿犯罪率下降替这地方辩护。那是错的。一个需要少数人永远替全城守边界的世界，不是避难所，是一份没人签过字的合同。" },
        { type: "dialogue", person: "miller", text: "漂亮。那你打算怎么处理合同里已经住进去的人？连人带纸一起烧了？" },
        { type: "dialogue", person: "erin", text: "别抢着赢。哈罗德，回答他。" },
      ],
      choices: [
        { kind: "speech", text: "追问摧毁会失去谁" },
        { kind: "speech", text: "让米勒提出保留条件" },
      ],
    };
  }

  if (approvedMaterial?.id === "m_ch05_s01_miller_argument") {
    return {
      events: [
        { type: "narration", text: acknowledgement },
        { type: "dialogue", person: "miller", text: "每天十一分钟。记忆完整，明确自愿，随时能走，每次开门都留记录。守门的人管不住，就换人、换规矩。别先把里面的人当垃圾清掉。" },
        { type: "dialogue", person: "harold", text: "规矩不会自己站岗。只要门还在，就总有人觉得自己比规矩更仁慈。" },
        { type: "dialogue", person: "erin", text: "很好。一个怕门失控，一个怕人被抹掉。现在说你们愿意为哪边负责。" },
      ],
      choices: [
        { kind: "speech", text: "逼哈罗德承认摧毁也是决定" },
        { kind: "speech", text: "问米勒谁来监督入口" },
      ],
    };
  }

  if (approvedMaterial?.id === "m_ch05_s01_deadlock") {
    return {
      events: [
        { type: "narration", text: acknowledgement },
        { type: "dialogue", person: "harold", text: "我的票是摧毁。不是因为现实值得原谅，是因为它必须属于所有醒着的人。" },
        { type: "dialogue", person: "miller", text: "我投保留。把边界写死，把守门人盯死。但别替里面的人决定，他们的生活不算生活。" },
        { type: "dialogue", person: "erin", text: "一比一。我不会拿丹尼尔替自己投票。最后一票是你的。" },
      ],
      choices: [
        { kind: "speech", text: "确认两边都说完了" },
        { kind: "action", text: "走到最后一票前" },
      ],
    };
  }

  return {
    events: [
      { type: "narration", text: acknowledgement },
      { type: "dialogue", person: first, text: fallbackDialogue[first] ?? "先按这个方向走。眼前能确认多少，就确认多少。" },
      { type: "action", person: second, text: movement },
      { type: "dialogue", person: third, text: fallbackDialogue[third] ?? "我来接下一步。要是哪里对不上，我们再回来拆。" },
    ],
    choices: [
      { kind: "action", text: "顺着现在线索继续查" },
      { kind: "speech", text: "先问清谁在隐瞒什么" },
    ],
  };
}

type VisibleEvent = {
  type: "narration" | "dialogue" | "action" | "reaction";
  person?: string;
  text: string;
};

type VisibleChoice = { kind: "action" | "speech"; text: string };
type VisibleTurn = { events: VisibleEvent[]; choices: VisibleChoice[] };

const visibleEventTypes = new Set<VisibleEvent["type"]>(["narration", "dialogue", "action", "reaction"]);

function visibleEvent(value: unknown, present: Set<string>): VisibleEvent | undefined {
  if (!value || typeof value !== "object") return;
  const item = value as Record<string, unknown>;
  if (typeof item.text !== "string" || !item.text.trim()) return;
  const requestedType = typeof item.type === "string" && visibleEventTypes.has(item.type as VisibleEvent["type"])
    ? item.type as VisibleEvent["type"]
    : "narration";
  const person = typeof item.person === "string" && present.has(item.person.trim()) ? item.person.trim() : undefined;
  const type = requestedType === "dialogue" && !person
    ? "narration"
    : requestedType === "narration" && person
      ? "reaction"
      : requestedType;
  return { type, ...(person ? { person } : {}), text: item.text.trim().slice(0, 320) };
}

function visibleChoice(value: unknown): VisibleChoice | undefined {
  if (!value || typeof value !== "object") return;
  const item = value as Record<string, unknown>;
  if (typeof item.text !== "string" || !item.text.trim()) return;
  const kind: VisibleChoice["kind"] = item.kind === "action" ? "action" : "speech";
  const text = item.text.trim()
    .replace(/^(?:你说|玩家|动作)\s*[:：]\s*/u, "")
    .replace(/^你\s*[:：]?\s*/u, "")
    .slice(0, 24)
    .trim();
  return text ? { kind, text } : undefined;
}

function visibleTurnCandidate(raw: unknown, runtime: RuntimePackage, segment: RuntimeSegment, inputKind: PlayerInputKind): VisibleTurn {
  const present = new Set(segment.present);
  const item = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
  const fallback = canonicalFallbackCandidate(runtime, segment, inputKind);
  const fallbackEvents = fallback.events.flatMap((entry) => visibleEvent(entry, present) ?? []);
  const events = (Array.isArray(item.events) ? item.events : [])
    .flatMap((entry) => visibleEvent(entry, present) ?? [])
    .slice(0, 7);
  for (const entry of fallbackEvents) {
    if (events.length >= 4) break;
    events.push(entry);
  }

  const fallbackChoices = fallback.choices.flatMap((entry) => visibleChoice(entry) ?? []);
  const choices = (Array.isArray(item.choices) ? item.choices : [])
    .flatMap((entry) => visibleChoice(entry) ?? [])
    .filter((entry, index, list) => list.findIndex((candidate) => candidate.text === entry.text) === index)
    .slice(0, 2);
  for (const entry of fallbackChoices) {
    if (choices.length >= 2) break;
    if (!choices.some((candidate) => candidate.text === entry.text)) choices.push(entry);
  }
  if (choices.length < 2 && !choices.some((entry) => entry.text === "先听听他们怎么说")) choices.push({ kind: "speech", text: "先听听他们怎么说" });
  if (choices.length < 2) choices.push({ kind: "action", text: "先把眼前的事做完" });
  return { events: events.slice(0, 7), choices: choices.slice(0, 2) };
}

function isNetworkOrTimeoutFailure(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /abort|timed?\s*out|timeout|network|fetch failed|econn|enotfound|socket/i.test(message);
}

function explicitPlayerProfileUpdate(input: string) {
  const text = input.trim();
  const patterns = [
    /^我是(.{1,30}?)(?:了)?[。.!！]?$/u,
    /^我(?:现在)?(?:改成|改为|要当|要扮演|扮演)(.{1,30}?)(?:了)?[。.!！]?$/u,
    /^从现在起(?:我是|我就是|把我当成)(.{1,30}?)[。.!！]?$/u,
  ];
  for (const pattern of patterns) {
    const candidate = text.match(pattern)?.[1]?.trim();
    if (!candidate || /[，,；;：:\n]/u.test(candidate) || /^(?:说|觉得|认为|想说)/u.test(candidate)) continue;
    return candidate.slice(0, 100);
  }
  return "";
}

function publicFact(runtime: RuntimePackage, factId: string) {
  if (runtime.state.facts.includes(factId) || runtime.state.revealed_fact_ids.includes(factId)) return true;
  const fact = runtime.facts.catalog.find((entry) => entry.id === factId);
  return Boolean(fact && fact.kind === "locked" && fact.known_by.includes("player"));
}

function chapterMaterial(runtime: RuntimePackage, chapterId: string, materialId: string) {
  for (const segment of runtime.segments) {
    if (segment.chapter_id !== chapterId || !segment.allowed_material_ids.includes(materialId)) continue;
    const material = segment.materials.find((entry) => entry.id === materialId);
    if (material) return material;
  }
  return undefined;
}

/**
 * Completion cards are authored presentation for story material that has
 * already been committed in the completed chapter. Do not downgrade that
 * authored media merely because a separate reveal ledger used a different
 * condition label; the material having actually played is the authority here.
 */
function legalCompletionSource(runtime: RuntimePackage, chapterId: string, sourceRef: string) {
  const separator = sourceRef.indexOf(":");
  if (separator < 1) return false;
  const kind = sourceRef.slice(0, separator);
  const id = sourceRef.slice(separator + 1);
  if (!id) return false;
  if (kind === "fact") return publicFact(runtime, id);
  if (kind !== "material") return false;

  const material = chapterMaterial(runtime, chapterId, id);
  if (!material) return false;
  return runtime.state.used_material_ids.includes(id);
}

function exposedReward(definition: ChapterClueRewardDefinition): ChapterClueReward {
  const { source_refs: sourceRefs, ...reward } = definition;
  return { ...reward, sourceRefs } as ChapterClueReward;
}

function fallbackReward(runtime: RuntimePackage, completedSegment: RuntimeSegment): ChapterClueReward | undefined {
  const chapterSegments = runtime.segments.filter((segment) => segment.chapter_id === completedSegment.chapter_id);
  const materials = chapterSegments.flatMap((segment) => segment.materials).reverse();
  const material = materials.find((entry) => legalCompletionSource(runtime, completedSegment.chapter_id, `material:${entry.id}`));
  if (material) {
    return {
      id: `clue_${completedSegment.chapter_id}_${material.id}`,
      type: "message",
      title: "获得新线索",
      text: material.detail,
      sourceRefs: [`material:${material.id}`],
    };
  }

  const allowedFactIds = [...new Set(chapterSegments.flatMap((segment) => segment.allowed_fact_ids))].reverse();
  const fact = allowedFactIds
    .map((id) => runtime.facts.catalog.find((entry) => entry.id === id))
    .find((entry) => entry && publicFact(runtime, entry.id));
  return fact ? {
    id: `clue_${completedSegment.chapter_id}_${fact.id}`,
    type: "message",
    title: "获得新线索",
    text: fact.text,
    sourceRefs: [`fact:${fact.id}`],
  } : undefined;
}

function chapterCompletePayload(
  story: StoryPackage,
  runtime: RuntimePackage,
  completedSegment: RuntimeSegment,
): ChapterCompletePayload | undefined {
  const chapterIndex = story.user_view.chapter_outline.findIndex((chapter) => chapter.id === completedSegment.chapter_id);
  const chapter = story.user_view.chapter_outline[chapterIndex];
  if (!chapter) return undefined;

  const definition = runtime.runtime.chapter_completions?.find((entry) => entry.chapter_id === completedSegment.chapter_id);
  const configuredRewardIsLegal = Boolean(definition?.reward.source_refs.length)
    && definition!.reward.source_refs.every((sourceRef) => legalCompletionSource(runtime, completedSegment.chapter_id, sourceRef));
  const reward = definition && configuredRewardIsLegal
    ? exposedReward(definition.reward)
    : fallbackReward(runtime, completedSegment);
  if (!reward) return undefined;

  const transitionMedia = definition && configuredRewardIsLegal && definition.transition_media
    ? {
      kind: definition.transition_media.kind,
      title: definition.transition_media.title,
      status: definition.transition_media.url && definition.transition_media.status !== "pending" ? "ready" as const : "pending" as const,
      ...(definition.transition_media.url ? { url: definition.transition_media.url } : {}),
      ...(definition.transition_media.poster ? { poster: definition.transition_media.poster } : {}),
      ...(definition.transition_media.caption ? { caption: definition.transition_media.caption } : {}),
    }
    : undefined;

  return {
    chapterId: chapter.id,
    chapterNumber: chapterIndex + 1,
    title: chapter.title,
    reward,
    ...(transitionMedia ? { transitionMedia } : {}),
  };
}


const SCENE_IMAGE_CUES = [
  { id: "ch01-drive-to-red-hook", materialId: "m_ch01_s02_schedule", url: "/ch01-drive-to-red-hook.png", title: "深夜驶向红钩区", pattern: /离开警局|出发|上车|前往|驶向|红钩|Red Hook|码头/ },
  { id: "ch02-red-hook-arrival", materialId: "m_ch01_s03_arrival", url: "/ch02-red-hook-arrival.png", title: "红钩区第99号仓库外", pattern: /门牌|墙面|排水管|对上|第99号|仓库|抵达/ },
  { id: "ch01-unknown-mechanic-monitor", materialId: "m_ch01_s04_monitor", url: "/ch01-unknown-mechanic-monitor.png", title: "监控画面：暴雨中修理机甲的白发老人", pattern: /监控|录像|回放|画面|白发/ },
  { id: "ch03-maya-found", materialId: "m_ch03_s02_maya", url: "/ch03-maya-found.png", title: "后台：找到玛雅", pattern: /玛雅/ },
  { id: "ch03-zero-unmasked", materialId: "m_ch03_s03_unmask", url: "/ch03-zero-unmasked.png", title: "零点摘下面罩", pattern: /面罩|摘下|揭下|丹尼尔/ },
] as const;

export async function POST(request: Request) {
  try {
    const body = await request.json() as { sessionId?: string; workflowToken?: string; history?: Message[]; input?: string; inputKind?: string; playerProfile?: string };
    const sessionId = body.sessionId?.trim();
    const submittedWorkflowToken = body.workflowToken?.trim();
    const input = body.input?.trim();
    if ((!sessionId && !submittedWorkflowToken) || !input) return Response.json({ error: "workflow_session_or_input_missing" }, { status: 400 });

    const workflow = submittedWorkflowToken
      ? await openWorkflowToken(submittedWorkflowToken)
      : sessionId ? getWorkflow(sessionId) : undefined;
    if (!workflow) return Response.json({ error: "workflow_not_compiled" }, { status: 409 });
    const currentWorkflowToken = submittedWorkflowToken || await sealWorkflow(workflow);
    const runtimePackage = workflow.runtimePackage;
    const segment = runtimePackage.segments.find((entry) => entry.id === runtimePackage.state.current_segment);
    if (!segment) return Response.json({ error: "runtime_segment_missing" }, { status: 500 });
    const policyIssue = runtimePolicyIssue(runtimePackage, segment);
    if (policyIssue) return Response.json({ error: `runtime_policy_invalid:${policyIssue}` }, { status: 502 });
    const chapterRule = chapterProgressionRule(runtimePackage, segment.chapter_id);
    const successfulTurns = runtimePackage.state.successful_turns_by_chapter?.[segment.chapter_id] ?? 0;
    if (successfulTurns >= chapterRule.max_successful_turns) {
      return Response.json({
        error: "chapter_turn_limit_reached",
        chapterId: segment.chapter_id,
        successfulTurns,
        maxSuccessfulTurns: chapterRule.max_successful_turns,
      }, { status: 409 });
    }

    const requestedInputKind = body.inputKind?.trim() as PlayerInputKind | undefined;
    const declaredProfileUpdate = explicitPlayerProfileUpdate(input);
    const inputKind: PlayerInputKind = declaredProfileUpdate
      ? "identity"
      : requestedInputKind && playerInputKinds.has(requestedInputKind)
      ? requestedInputKind
      : "freeform";
    const submittedProfile = typeof body.playerProfile === "string" ? body.playerProfile.trim().slice(0, 100) : "";
    const playerProfile = declaredProfileUpdate
      || (inputKind === "identity" ? (submittedProfile || input.slice(0, 100)) : submittedProfile);
    const history = Array.isArray(body.history)
      ? body.history.filter((message): message is Message => Boolean(message && typeof message === "object" && typeof message.text === "string")).slice(-30)
      : [];
    const policyRuntime: RuntimePackage = runtimePackage;
    const context = {
      runtime: policyRuntime,
      segment,
      story: workflow.storyPackage,
      history,
      userInput: input,
      inputKind,
    };
    const packet = buildRuntimePacket(
      policyRuntime,
      segment,
      workflow.storyPackage,
      history,
      playerProfile,
      inputKind,
    );

    let raw: unknown;
    let modelFallbackReason = "";
    try {
      raw = await callStoryModel(
        prompt3(packet, input, inputKind),
        "生成Prompt 3本轮输出。",
        0.55,
        2200,
        {
          stage: "prompt3",
          requestTimeoutMs: 18000,
        },
      );
    } catch (error) {
      if (isNetworkOrTimeoutFailure(error)) throw error;
      modelFallbackReason = error instanceof Error ? error.message : "model_output_unavailable";
      console.warn("[prompt3-soft-policy] model output replaced with canon fallback", { reason: modelFallbackReason });
      raw = canonicalFallbackCandidate(policyRuntime, segment, inputKind);
    }

    const modelVisibleTurn = visibleTurnCandidate(raw, policyRuntime, segment, inputKind);
    const strictValidation = validateAndNormalizeTurn(raw, context);
    let validation = strictValidation;
    let visibleTurn = modelVisibleTurn;
    let protocolNotice = modelFallbackReason;
    if (!validation.ok) {
      protocolNotice = validation.reason;
      console.warn("[prompt3-soft-policy] displaying model reply and advancing with canon state", { reason: validation.reason });
      const canonicalRaw = canonicalFallbackCandidate(policyRuntime, segment, inputKind);
      const canonicalValidation = validateAndNormalizeTurn(canonicalRaw, context);
      if (!canonicalValidation.ok) {
        console.error("[prompt3-soft-policy] canon fallback could not advance state", { reason: canonicalValidation.reason });
        return Response.json({
          workflowToken: currentWorkflowToken,
          events: modelVisibleTurn.events,
          choices: modelVisibleTurn.choices,
          current: { segmentId: segment.id, chapterId: segment.chapter_id, location: segment.location },
          present: segment.present,
          visibleCharacters: visibleCharacterIds(workflow.storyPackage, runtimePackage, segment),
          responseContract: runtimePackage.runtime.response_contract,
          playerProfile,
          protocolNotice: canonicalValidation.reason,
        });
      }
      validation = canonicalValidation;
      // Media-critical authored beats must remain visible before their media is
      // triggered. Other policy misses keep the model's prose on screen.
      if (!strictValidation.ok && strictValidation.reason === "childhood_song_scene_missing") {
        visibleTurn = visibleTurnCandidate(canonicalRaw, policyRuntime, segment, inputKind);
      }
    }

    const previousChapter = segment.chapter_id;
    const commit = commitRuntimeWorkflow(workflow, runtimePackage.state.version, validation.turn.state_delta);
    if (!commit.ok) {
      console.warn("[prompt3-soft-policy] reply shown without state commit", { reason: commit.reason });
      return Response.json({
        workflowToken: currentWorkflowToken,
        events: visibleTurn.events,
        choices: visibleTurn.choices,
        current: { segmentId: segment.id, chapterId: segment.chapter_id, location: segment.location },
        present: segment.present,
        visibleCharacters: visibleCharacterIds(workflow.storyPackage, runtimePackage, segment),
        responseContract: runtimePackage.runtime.response_contract,
        playerProfile,
        protocolNotice: commit.reason,
      });
    }

    const nextSegment = commit.workflow.runtimePackage.segments.find((entry) => entry.id === commit.state.current_segment);
    if (!nextSegment) {
      return Response.json({
        workflowToken: await sealWorkflow(commit.workflow),
        events: visibleTurn.events,
        choices: visibleTurn.choices,
        current: { segmentId: segment.id, chapterId: segment.chapter_id, location: segment.location },
        present: segment.present,
        visibleCharacters: visibleCharacterIds(workflow.storyPackage, runtimePackage, segment),
        responseContract: runtimePackage.runtime.response_contract,
        playerProfile,
        protocolNotice: "committed_runtime_segment_missing",
      });
    }
    const chapterChanged = nextSegment.chapter_id !== previousChapter;
    const outline = commit.workflow.storyPackage.user_view.chapter_outline.find((chapter) => chapter.id === nextSegment.chapter_id);
    const chapterComplete = chapterChanged
      ? chapterCompletePayload(commit.workflow.storyPackage, commit.workflow.runtimePackage, segment)
      : undefined;
    const chapterEntry = chapterChanged
      ? commit.workflow.runtimePackage.runtime.chapter_entries?.find((entry) => entry.chapter_id === nextSegment.chapter_id)
      : undefined;
    const finaleVote = commit.workflow.runtimePackage.runtime.finale_vote?.trigger_segment_id === nextSegment.id
      ? commit.workflow.runtimePackage.runtime.finale_vote
      : undefined;
    const childhoodSongMaterialUsed = validation.turn.state_delta.used_material_ids?.includes("m_ch02_s03_song") ?? false;
    const childhoodSongEventIndex = childhoodSongMaterialUsed
      ? visibleTurn.events.findIndex((event, index, events) => {
        const nearby = events.slice(index, index + 3).map((entry) => entry.text).join(" ");
        return /(旧音响|壁挂音响|扬声器|琴声|歌曲|旋律|电流爆音|合成琴)/.test(event.text)
          && /(艾琳|她)/.test(nearby)
          && /(听见|听到|认出|僵住|僵在|手电|弟弟)/.test(nearby);
      })
      : -1;

    const usedMaterialsThisTurn = validation.turn.state_delta.used_material_ids ?? [];
    const sceneImageCues = SCENE_IMAGE_CUES
      .filter((cue) => usedMaterialsThisTurn.includes(cue.materialId))
      .map((cue) => {
        let eventIndex = visibleTurn.events.findIndex((event) => cue.pattern.test(event.text));
        if (eventIndex < 0) {
          for (let index = visibleTurn.events.length - 1; index >= 0; index -= 1) {
            if (visibleTurn.events[index].type === "narration") { eventIndex = index; break; }
          }
        }
        if (eventIndex < 0) eventIndex = visibleTurn.events.length - 1;
        return { id: cue.id, kind: "image" as const, url: cue.url, title: cue.title, eventIndex };
      });

    return Response.json({
      workflowToken: await sealWorkflow(commit.workflow),
      events: visibleTurn.events,
      choices: visibleTurn.choices,
      current: { segmentId: nextSegment.id, chapterId: nextSegment.chapter_id, location: nextSegment.location },
      present: nextSegment.present,
      visibleCharacters: visibleCharacterIds(commit.workflow.storyPackage, commit.workflow.runtimePackage, nextSegment),
      responseContract: commit.workflow.runtimePackage.runtime.response_contract,
      playerProfile,
      mediaCue: childhoodSongEventIndex >= 0 ? {
        id: "ch02-childhood-song",
        kind: "audio",
        url: "/childhood-country-americana-approach.mp3",
        eventIndex: childhoodSongEventIndex,
      } : undefined,
      mediaCues: sceneImageCues.length ? sceneImageCues : undefined,
      chapterComplete,
      finaleVote,
      ...(protocolNotice ? { protocolNotice } : {}),
      transition: chapterChanged ? {
        chapterId: nextSegment.chapter_id,
        title: outline?.title,
        goal: outline?.synopsis,
        ...(chapterEntry ? { entryPrompt: chapterEntry } : {}),
      } : undefined,
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "turn_failed" }, { status: 502 });
  }
}
