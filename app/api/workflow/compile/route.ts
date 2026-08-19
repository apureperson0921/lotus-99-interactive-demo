import { callStoryModel } from "../../../model-client";
import { visibleCharacterIds } from "../../../workflow-policy";
import { createPrecompiledWorkflow } from "../../../workflow-precompiled";
import { prompt1, prompt2 } from "../../../workflow-prompts";
import { workflowSource } from "../../../workflow-source";
import { normalizeWorkflow } from "../../../workflow-store";
import { sealWorkflow } from "../../../workflow-token";
import type { CanonicalFact, LockedOpeningEvent, PlayerContract, RelationshipRule, RevealGate, RuntimePackage, SegmentPlan, StoryPackage } from "../../../workflow-contract";

type Validation = { ok: true } | { ok: false; reason: string };
const arcPhases = ["起", "承", "转", "合"] as const;

function fail(reason: string): Validation {
  return { ok: false, reason };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function canonicalJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalJson);
  if (!isRecord(value)) return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalJson(value[key])]));
}

function exactJson(left: unknown, right: unknown) {
  return JSON.stringify(canonicalJson(left)) === JSON.stringify(canonicalJson(right));
}

function exactIds(value: unknown, expected: string[]) {
  return Array.isArray(value)
    && value.length === expected.length
    && value.every((item, index) => isRecord(item) && item.id === expected[index]);
}

function sourceEntriesPreserved(value: unknown, expected: Array<Record<string, unknown>>, fields: string[]) {
  if (!Array.isArray(value)) return false;
  const records = value.filter(isRecord);
  const ids = records.flatMap((entry) => typeof entry.id === "string" ? [entry.id] : []);
  if (new Set(ids).size !== ids.length) return false;
  return expected.every((sourceEntry) => {
    const candidate = records.find((entry) => entry.id === sourceEntry.id);
    return Boolean(candidate && fields.every((field) => exactJson(candidate[field], sourceEntry[field])));
  });
}

function mergeAuthoritativeEntries<T extends { id: string }>(source: T[], generated: T[]) {
  const sourceIds = new Set(source.map((entry) => entry.id));
  return [
    ...structuredClone(source),
    ...structuredClone(generated.filter((entry) => !sourceIds.has(entry.id))),
  ];
}

function validatePlayerContract(value: unknown): Validation {
  if (!isRecord(value) || value.id !== "player" || value.role !== "independent_participant") return fail("player_contract_identity_invalid");
  if (value.identity_policy !== "user_defined_only" || value.choice_owner !== "player" || value.action_owner !== "player") return fail("player_ownership_invalid");
  if (!Array.isArray(value.user_owned_fields) || !Array.isArray(value.cannot_replace) || !value.user_owned_fields.length || !value.cannot_replace.length) return fail("player_boundaries_missing");
  if (!Array.isArray(value.opening_choices) || value.opening_choices.length !== 2) return fail("opening_choices_invalid");
  if (!value.opening_choices.every((choice) => isRecord(choice) && typeof choice.text === "string" && (choice.kind === "speech" || choice.kind === "action") && choice.owner === "player")) return fail("opening_choice_owner_invalid");
  if (!Array.isArray(value.wildcard_speech) || !value.wildcard_speech.length || !value.wildcard_speech.every((line) => typeof line === "string" && line.trim())) return fail("wildcard_speech_invalid");
  return { ok: true };
}

function hasEmotionalEngine(value: unknown) {
  if (!isRecord(value) || !isRecord(value.emotional_engine)) return false;
  const engine = value.emotional_engine;
  return ["core_wound", "unmet_need", "defense", "false_belief", "secret_desire", "relational_trigger", "transformation"]
    .every((field) => typeof engine[field] === "string" && String(engine[field]).trim());
}

function hasChapterArc(value: unknown) {
  if (!isRecord(value) || typeof value.chapter_id !== "string" || typeof value.emotional_question !== "string"
    || typeof value.relationship_engine !== "string" || !isRecord(value.beats)) return false;
  const beats = value.beats;
  return arcPhases.every((phase) => isRecord(beats[phase]));
}

function validateStoryPackage(value: unknown): Validation {
  if (!isRecord(value) || !isRecord(value.user_view) || !isRecord(value.director_data)) return fail("story_package_shape_invalid");
  const userView = value.user_view;
  const director = value.director_data;
  if (!Array.isArray(userView.chapter_outline) || userView.chapter_outline.length !== workflowSource.storyCard.chapters.length) return fail("chapter_outline_incomplete");
  if (!Array.isArray(userView.character_bios) || !userView.character_bios.length) return fail("public_character_bios_missing");
  if (!Array.isArray(director.characters) || director.characters.length !== workflowSource.selectedBotPersonas.length) return fail("director_characters_incomplete");
  if (!(director.characters as unknown[]).every(hasEmotionalEngine)) return fail("character_emotional_engine_missing");
  if (!Array.isArray(director.chapter_arcs) || director.chapter_arcs.length !== workflowSource.storyCard.chapters.length) return fail("chapter_arcs_incomplete");
  if (!(director.chapter_arcs as unknown[]).every(hasChapterArc)) return fail("chapter_arc_beats_missing");
  const player = validatePlayerContract(director.player_contract);
  if (!player.ok) return player;
  if (!isRecord(director.opening) || !exactJson(director.opening.locked_events, workflowSource.storyCard.opening.locked_events)) return fail("locked_opening_changed");
  const publicBioIds = new Set((userView.character_bios as Array<Record<string, unknown>>).flatMap((bio) => typeof bio.id === "string" ? [bio.id] : []));
  const openingPeople = new Set(workflowSource.storyCard.opening.locked_events.flatMap((event) => event.person ? [event.person] : []));
  if ([...openingPeople].some((id) => !publicBioIds.has(id))) return fail("opening_character_bio_missing");
  if (!sourceEntriesPreserved(director.fact_catalog, workflowSource.storyCard.factCatalog, ["id", "text", "kind", "known_by", "reveal_gate_id"])) return fail("source_facts_changed");
  const sourceFactIds = new Set(workflowSource.storyCard.factCatalog.map((fact) => fact.id));
  if (!(director.fact_catalog as unknown[]).every((fact) => isRecord(fact)
    && typeof fact.id === "string"
    && typeof fact.text === "string"
    && (fact.kind === "locked" || fact.kind === "clue" || fact.kind === "secret")
    && Array.isArray(fact.known_by)
    && (sourceFactIds.has(fact.id) || fact.origin === "authored_enrichment"))) return fail("authored_enrichment_fact_invalid");
  if (!sourceEntriesPreserved(director.relationship_rules, workflowSource.storyCard.relationshipRules, ["id", "participants", "canonical", "public_summary", "known_by", "public_from_segment", "condition", "aliases_before_reveal"])) return fail("source_relationships_changed");
  if (!sourceEntriesPreserved(director.reveal_gates, workflowSource.storyCard.revealGates, ["id", "fact_ids", "known_by", "public_from_segment", "condition", "aliases_before_reveal", "forbidden_reveals"])) return fail("source_reveal_gates_changed");
  if (!exactIds(director.segment_plan, workflowSource.storyCard.segmentPlan.map((segment) => segment.id))) return fail("segment_plan_ids_changed");
  if (!(director.segment_plan as Array<Record<string, unknown>>).every((segment, index) => segment.chapter_id === workflowSource.storyCard.segmentPlan[index].chapter_id && segment.location === workflowSource.storyCard.segmentPlan[index].location)) return fail("segment_plan_boundary_changed");
  return { ok: true };
}

function isStoryPackage(value: unknown): value is StoryPackage {
  return validateStoryPackage(value).ok;
}

function validateResponseContract(value: unknown): Validation {
  if (!isRecord(value) || !isRecord(value.event_count) || value.event_count.min !== 4 || value.event_count.max !== 7) return fail("response_event_count_not_4_to_7");
  if (!isRecord(value.choices) || value.choices.count !== 2) return fail("response_choice_count_invalid");
  if (!exactJson(value.choices.allowed_kinds, ["action", "speech"])) return fail("response_choice_kinds_invalid");
  if (!Array.isArray(value.choices.forbidden_prefixes)
    || !value.choices.forbidden_prefixes.every((prefix) => typeof prefix === "string")) return fail("response_choice_prefixes_invalid");
  return { ok: true };
}

function validateRuntimePackage(value: unknown, story: StoryPackage, expectedPlans: SegmentPlan[] = story.director_data.segment_plan): Validation {
  if (!isRecord(value) || !isRecord(value.runtime) || !isRecord(value.facts) || !isRecord(value.state)) return fail("runtime_package_shape_invalid");
  const runtime = value.runtime;
  const state = value.state;
  const player = validatePlayerContract(runtime.player_contract);
  if (!player.ok) return player;
  if (!exactJson(runtime.player_contract, story.director_data.player_contract)) return fail("runtime_player_contract_changed");
  const response = validateResponseContract(runtime.response_contract);
  if (!response.ok) return response;
  if (!isRecord(runtime.opening) || !exactJson(runtime.opening.locked_events, story.director_data.opening.locked_events)) return fail("runtime_locked_opening_changed");
  if (!Array.isArray(runtime.relationship_rules) || !Array.isArray(runtime.reveal_gates) || !Array.isArray(value.facts.catalog)) return fail("runtime_canonical_arrays_missing");
  if (!expectedPlans.length || !Array.isArray(value.segments)) return fail("runtime_segments_changed");
  const rawSegments = value.segments as unknown[];
  const compiledSegments = expectedPlans.map((plan) => rawSegments.find((candidate: unknown) => isRecord(candidate) && candidate.id === plan.id));
  if (compiledSegments.some((segment) => !segment)) return fail("runtime_segments_changed");
  const isFullCompile = expectedPlans.length === story.director_data.segment_plan.length;
  if (isFullCompile && rawSegments.length !== expectedPlans.length) return fail("runtime_segments_changed");
  if (state.version !== 1 || (isFullCompile && state.current_segment !== expectedPlans[0]?.id)) return fail("runtime_initial_state_invalid");
  if (state.social_beats_in_segment !== 0 || state.turn_in_segment !== 0 || !Array.isArray(state.conditions) || !state.conditions.includes("opening_completed")) return fail("runtime_pacing_state_invalid");

  const rawCharacters = Array.isArray(value.characters) ? value.characters : [];
  const characterIds = new Set(rawCharacters.flatMap((character) => isRecord(character) && typeof character.id === "string" ? [character.id] : []));
  const knowledgeReferenceIds = new Set([
    ...story.director_data.fact_catalog.map((fact) => fact.id),
    ...story.director_data.relationship_rules.map((relationship) => relationship.id),
  ]);
  for (const directorCharacter of story.director_data.characters) {
    const runtimeCharacter = rawCharacters.find((character) => isRecord(character) && character.id === directorCharacter.id);
    if (!isRecord(runtimeCharacter) || typeof runtimeCharacter.card !== "string" || runtimeCharacter.card.trim().length < 40) {
      return fail(`character_${directorCharacter.id}_decision_card_missing`);
    }
    if (!isRecord(runtimeCharacter.knowledge)
      || !Array.isArray(runtimeCharacter.knowledge.knows)
      || !Array.isArray(runtimeCharacter.knowledge.does_not_know)) {
      return fail(`character_${directorCharacter.id}_knowledge_boundary_missing`);
    }
    const knows = runtimeCharacter.knowledge.knows;
    const doesNotKnow = runtimeCharacter.knowledge.does_not_know;
    if (![...knows, ...doesNotKnow].every((id) => typeof id === "string" && knowledgeReferenceIds.has(id))) {
      return fail(`character_${directorCharacter.id}_knowledge_reference_invalid`);
    }
    if (knows.some((id) => doesNotKnow.includes(id))) return fail(`character_${directorCharacter.id}_knowledge_boundary_conflict`);
  }
  const openingPeople = new Set(story.director_data.opening.locked_events.flatMap((event) => event.person ? [event.person] : []));
  const segmentIndex = new Map(story.director_data.segment_plan.map((segment, index) => [segment.id, index]));
  const minimumTurnsByChapter = new Map<string, number>();
  for (let index = 0; index < compiledSegments.length; index += 1) {
    const segment = compiledSegments[index];
    const plan = expectedPlans[index];
    const globalPlanIndex = story.director_data.segment_plan.findIndex((entry) => entry.id === plan.id);
    if (!isRecord(segment) || segment.chapter_id !== plan.chapter_id || segment.location !== plan.location) return fail(`segment_${plan.id}_location_changed`);
    const present = Array.isArray(segment.present) ? segment.present : [];
    if (new Set(present).size < 2 || !present.every((id) => typeof id === "string" && characterIds.has(id))) return fail(`segment_${plan.id}_needs_two_present_npcs`);
    for (const gate of story.director_data.reveal_gates) {
      const publicIndex = gate.public_from_segment ? segmentIndex.get(gate.public_from_segment) : undefined;
      const gatedCharacterIds = Object.keys(gate.aliases_before_reveal).filter((id) => characterIds.has(id));
      if (publicIndex !== undefined && globalPlanIndex < publicIndex && gatedCharacterIds.some((id) => present.includes(id))) return fail(`segment_${plan.id}_contains_unrevealed_character`);
    }
    if (globalPlanIndex === 0 && [...openingPeople].some((id) => !present.includes(id))) return fail("opening_people_missing_from_first_segment");
    if (!isRecord(segment.scene_boundary) || !Array.isArray(segment.scene_boundary.allowed_scope) || !Array.isArray(segment.scene_boundary.exit_conditions)) return fail(`segment_${plan.id}_boundary_missing`);
    if (!isRecord(segment.dramatic) || !segment.dramatic.emotional_objective || !segment.dramatic.pressure || !segment.dramatic.turn) return fail(`segment_${plan.id}_emotional_arc_missing`);
    const arcContract = segment.arc_contract;
    if (!isRecord(arcContract)
      || typeof arcContract.chapter_question !== "string"
      || !Array.isArray(arcContract.relationship_focus)
      || typeof arcContract.emotional_stakes !== "string"
      || !isRecord(arcContract.beats)) return fail(`segment_${plan.id}_arc_contract_missing`);
    const arcBeats = arcContract.beats;
    if (!arcPhases.every((phase) => {
      const beat = arcBeats[phase];
      return isRecord(beat)
        && typeof beat.dramatic_function === "string"
        && typeof beat.emotional_turn === "string"
        && typeof beat.relationship_turn === "string"
        && typeof beat.guiding_question === "string"
        && typeof beat.choice_guidance === "string";
    })) return fail(`segment_${plan.id}_arc_contract_missing`);
    if (!isRecord(segment.tempo_budget) || typeof segment.tempo_budget.min_social_beats_before_plot_advance !== "number" || segment.tempo_budget.min_social_beats_before_plot_advance < 2) return fail(`segment_${plan.id}_tempo_budget_invalid`);
    if (!Array.isArray(segment.tempo_budget.required_social_beats) || segment.tempo_budget.required_social_beats.length < 2) return fail(`segment_${plan.id}_social_beats_missing`);
    if (segment.tempo_budget.max_materials_per_turn !== 1 || segment.tempo_budget.max_major_changes_per_turn !== 1) return fail(`segment_${plan.id}_change_budget_invalid`);
    if (!Array.isArray(segment.materials) || segment.materials.length > 6) return fail(`segment_${plan.id}_materials_invalid`);
    if (!Array.isArray(segment.allowed_fact_ids) || !Array.isArray(segment.allowed_material_ids) || !segment.allowed_material_ids.length || !Array.isArray(segment.forbidden_reveal_ids)) return fail(`segment_${plan.id}_allowlists_missing`);
    minimumTurnsByChapter.set(
      plan.chapter_id,
      (minimumTurnsByChapter.get(plan.chapter_id) ?? 0)
        + segment.tempo_budget.min_social_beats_before_plot_advance
        + Math.max(1, segment.allowed_material_ids.length),
    );
    const expectedNext = story.director_data.segment_plan[globalPlanIndex + 1]?.id;
    if ((segment.next || undefined) !== expectedNext) return fail(`segment_${plan.id}_next_invalid`);
  }
  if (isFullCompile) {
    const overBudgetChapter = [...minimumTurnsByChapter.entries()].find(([, turns]) => turns > 20);
    if (overBudgetChapter) return fail(`chapter_${overBudgetChapter[0]}_minimum_turns_${overBudgetChapter[1]}_exceeds_20`);
  }
  return { ok: true };
}

function preserveAuthoritativeSource(story: StoryPackage) {
  story.director_data.player_contract = structuredClone(workflowSource.storyCard.playerContract) as PlayerContract;
  story.director_data.opening.locked_events = structuredClone(workflowSource.storyCard.opening.locked_events) as LockedOpeningEvent[];
  story.director_data.fact_catalog = mergeAuthoritativeEntries(
    workflowSource.storyCard.factCatalog as CanonicalFact[],
    story.director_data.fact_catalog,
  );
  story.director_data.relationship_rules = mergeAuthoritativeEntries(
    workflowSource.storyCard.relationshipRules as RelationshipRule[],
    story.director_data.relationship_rules,
  );
  story.director_data.reveal_gates = mergeAuthoritativeEntries(
    workflowSource.storyCard.revealGates as RevealGate[],
    story.director_data.reveal_gates,
  );
  story.director_data.segment_plan = structuredClone(workflowSource.storyCard.segmentPlan) as SegmentPlan[];
  const firstSegment = story.director_data.segment_plan[0]?.id;
  const openingPeople = new Set(story.director_data.opening.locked_events.flatMap((event) => event.person ? [event.person] : []));
  const characterIds = new Set(story.director_data.characters.map((character) => character.id));
  const segmentIndex = new Map(story.director_data.segment_plan.map((segment, index) => [segment.id, index]));
  const gatedVisibility = new Map<string, string>();
  for (const gate of story.director_data.reveal_gates) {
    if (!gate.public_from_segment) continue;
    for (const characterId of Object.keys(gate.aliases_before_reveal).filter((id) => characterIds.has(id))) {
      const previous = gatedVisibility.get(characterId);
      if (!previous || (segmentIndex.get(gate.public_from_segment) ?? Infinity) < (segmentIndex.get(previous) ?? Infinity)) gatedVisibility.set(characterId, gate.public_from_segment);
    }
  }
  for (const bio of story.user_view.character_bios) {
    if (openingPeople.has(bio.id) && firstSegment) bio.public_from_segment = firstSegment;
    else if (gatedVisibility.has(bio.id)) bio.public_from_segment = gatedVisibility.get(bio.id);
    else if (!bio.public_from_segment || !segmentIndex.has(bio.public_from_segment)) bio.public_from_segment = firstSegment;
  }
}

function normalizeRuntimeFromStory(runtime: RuntimePackage, story: StoryPackage) {
  const authoredRuntime = createPrecompiledWorkflow().runtimePackage.runtime;
  runtime.runtime.player_contract = structuredClone(story.director_data.player_contract);
  runtime.runtime.opening.locked_events = structuredClone(story.director_data.opening.locked_events);
  runtime.runtime.relationship_rules = structuredClone(story.director_data.relationship_rules);
  runtime.runtime.reveal_gates = structuredClone(story.director_data.reveal_gates);
  runtime.runtime.chapter_completions = structuredClone(authoredRuntime.chapter_completions);
  runtime.runtime.chapter_entries = structuredClone(authoredRuntime.chapter_entries);
  runtime.runtime.finale_vote = structuredClone(authoredRuntime.finale_vote);
  runtime.runtime.chapter_progression = workflowSource.storyCard.chapterTurnLimits.map((rule) => {
    const chapterSegments = runtime.segments.filter((segment) => segment.chapter_id === rule.chapter_id);
    return {
      chapter_id: rule.chapter_id,
      max_successful_turns: rule.max_successful_turns,
      required_material_ids: [...new Set(chapterSegments.flatMap((segment) => segment.allowed_material_ids))],
      required_condition_ids: [...new Set(chapterSegments.flatMap((segment) => [
        ...segment.exit,
        ...segment.scene_boundary.exit_conditions,
      ]))],
    };
  });
  runtime.facts.catalog = structuredClone(story.director_data.fact_catalog);
}

function resetRuntimeState(runtime: RuntimePackage, story: StoryPackage) {
  runtime.state = {
    version: 1,
    current_segment: story.director_data.segment_plan[0].id,
    facts: [],
    clues: {},
    relationships: [],
    conditions: ["opening_completed"],
    used_material_ids: [],
    revealed_fact_ids: [],
    satisfied_reveal_gate_ids: [],
    social_beats: [],
    social_beats_in_segment: 0,
    turn_in_segment: 0,
    successful_turns_by_chapter: {},
    summary: "锁定开场刚结束，等待玩家第一次回应",
  };
}

async function compiledResponse(sessionId: string, story: StoryPackage, runtime: RuntimePackage, compiledFrom: "model" | "precompiled") {
  const workflow = normalizeWorkflow({ storyPackage: story, runtimePackage: runtime, createdAt: Date.now() });
  const normalizedRuntime = workflow.runtimePackage;
  const currentSegment = normalizedRuntime.segments.find((segment) => segment.id === normalizedRuntime.state.current_segment);
  return Response.json({
    sessionId,
    workflowToken: await sealWorkflow(workflow),
    compiledFrom,
    story: story.user_view,
    opening: normalizedRuntime.runtime.opening,
    playerContract: normalizedRuntime.runtime.player_contract,
    responseContract: normalizedRuntime.runtime.response_contract,
    roleCardCharacters: story.user_view.character_bios,
    visibleCharacters: currentSegment ? visibleCharacterIds(story, normalizedRuntime, currentSegment) : [],
    present: currentSegment?.present ?? [],
    runtimeState: normalizedRuntime.state,
    current: currentSegment ? { segmentId: currentSegment.id, chapterId: currentSegment.chapter_id, location: currentSegment.location } : undefined,
  });
}

async function compileWorkflow(sessionId: string, recompile = false) {
  try {
    if (!recompile) {
      const { storyPackage, runtimePackage } = createPrecompiledWorkflow();
      preserveAuthoritativeSource(storyPackage);
      normalizeRuntimeFromStory(runtimePackage, storyPackage);
      resetRuntimeState(runtimePackage, storyPackage);
      const storyValidation = validateStoryPackage(storyPackage);
      const runtimeValidation = validateRuntimePackage(runtimePackage, storyPackage);
      if (!storyValidation.ok) return Response.json({ error: `precompiled_prompt1_invalid: ${storyValidation.reason}` }, { status: 500 });
      if (!runtimeValidation.ok) return Response.json({ error: `precompiled_prompt2_invalid: ${runtimeValidation.reason}` }, { status: 500 });
      return compiledResponse(sessionId, storyPackage, runtimePackage, "precompiled");
    }

    const storyPackageRaw = await callStoryModel(
      prompt1(workflowSource.storyCard, workflowSource.selectedBotPersonas),
      "编译Prompt 1。",
      0.05,
      7000,
      { stage: "prompt1", validate: validateStoryPackage, primaryModel: "kaon/gemini-3.7-flash", fallbackModel: "kaon/deepseek-v4-flash", requestTimeoutMs: 32000 },
    );
    if (!isStoryPackage(storyPackageRaw)) return Response.json({ error: "prompt1_invalid" }, { status: 502 });
    preserveAuthoritativeSource(storyPackageRaw);

    const segmentPlans = storyPackageRaw.director_data.segment_plan;
    const midpoint = Math.ceil(segmentPlans.length / 2);
    const planChunks = [segmentPlans.slice(0, midpoint), segmentPlans.slice(midpoint)].filter((chunk) => chunk.length);
    const runtimeParts = await Promise.all(planChunks.map((plans, index) => {
      const scopedStory = structuredClone(storyPackageRaw);
      scopedStory.director_data.segment_plan = structuredClone(plans);
      return callStoryModel(
      prompt2(scopedStory, plans.map((plan) => plan.id), segmentPlans.map((plan) => plan.id)),
      `编译Prompt 2分片 ${index + 1}/${planChunks.length}。`,
      0.05,
      6000,
      { stage: "prompt2", validate: (value) => validateRuntimePackage(value, storyPackageRaw, plans), primaryModel: "kaon/gemini-3.7-flash", fallbackModel: "kaon/deepseek-v4-flash", requestTimeoutMs: 32000 },
    );
    }));
    const runtimePackageRaw = runtimeParts[0] as RuntimePackage;
    runtimePackageRaw.segments = segmentPlans.flatMap((plan) => runtimeParts.flatMap((part) => {
      if (!isRecord(part) || !Array.isArray(part.segments)) return [];
      return (part.segments as RuntimePackage["segments"]).filter((segment) => segment.id === plan.id);
    }));
    runtimePackageRaw.state.current_segment = segmentPlans[0].id;
    const runtimeValidation = validateRuntimePackage(runtimePackageRaw, storyPackageRaw);
    if (!runtimeValidation.ok) return Response.json({ error: `prompt2_invalid: ${runtimeValidation.reason}` }, { status: 502 });
    const runtimePackage = runtimePackageRaw as RuntimePackage;
    normalizeRuntimeFromStory(runtimePackage, storyPackageRaw);
    resetRuntimeState(runtimePackage, storyPackageRaw);

    return compiledResponse(sessionId, storyPackageRaw, runtimePackage, "model");
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "compile_failed" }, { status: 502 });
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as { sessionId?: string; recompile?: boolean };
  return compileWorkflow(body.sessionId?.trim() || crypto.randomUUID(), body.recompile === true);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  return compileWorkflow(url.searchParams.get("sessionId")?.trim() || crypto.randomUUID(), url.searchParams.get("recompile") === "1");
}
