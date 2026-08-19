import type { ChapterProgressionRule, RuntimePackage, RuntimeState, StateDelta, StoryPackage } from "./workflow-contract";

export type CompiledWorkflow = { storyPackage: StoryPackage; runtimePackage: RuntimePackage; createdAt: number };
export type StateCommit =
  | { ok: true; workflow: CompiledWorkflow; state: RuntimeState }
  | { ok: false; reason: "workflow_missing" | "state_version_conflict" | "state_delta_invalid" | "chapter_turn_limit_reached" };

const workflowGlobal = globalThis as typeof globalThis & { __lotusWorkflowSessions?: Map<string, CompiledWorkflow> };
const workflowSessions = workflowGlobal.__lotusWorkflowSessions ??= new Map<string, CompiledWorkflow>();

function unique(values: string[]) {
  return [...new Set(values)];
}

function validTurnCounts(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value)
    .filter((entry): entry is [string, number] => Number.isInteger(entry[1]) && Number(entry[1]) >= 0));
}

function normalizeChapterProgression(runtime: RuntimePackage, story: StoryPackage): ChapterProgressionRule[] {
  const configured = new Map((runtime.runtime.chapter_progression ?? []).map((rule) => [rule.chapter_id, rule]));
  return story.user_view.chapter_outline.map((chapter) => {
    const segments = runtime.segments.filter((segment) => segment.chapter_id === chapter.id);
    const allowedMaterials = unique(segments.flatMap((segment) => segment.allowed_material_ids));
    const exitConditions = unique(segments.flatMap((segment) => [
      ...segment.exit,
      ...segment.scene_boundary.exit_conditions,
    ]));
    const rule = configured.get(chapter.id);
    const requestedLimit = Number(rule?.max_successful_turns);
    return {
      chapter_id: chapter.id,
      max_successful_turns: Number.isInteger(requestedLimit) && requestedLimit > 0
        ? Math.min(20, requestedLimit)
        : 20,
      required_material_ids: rule
        ? unique(rule.required_material_ids).filter((id) => allowedMaterials.includes(id))
        : allowedMaterials,
      required_condition_ids: rule
        ? unique(rule.required_condition_ids).filter((id) => exitConditions.includes(id))
        : exitConditions,
    };
  });
}

export function chapterProgressionRule(runtime: RuntimePackage, chapterId: string): ChapterProgressionRule {
  return runtime.runtime.chapter_progression?.find((rule) => rule.chapter_id === chapterId) ?? {
    chapter_id: chapterId,
    max_successful_turns: 20,
    required_material_ids: unique(runtime.segments
      .filter((segment) => segment.chapter_id === chapterId)
      .flatMap((segment) => segment.allowed_material_ids)),
    required_condition_ids: unique(runtime.segments
      .filter((segment) => segment.chapter_id === chapterId)
      .flatMap((segment) => [...segment.exit, ...segment.scene_boundary.exit_conditions])),
  };
}

function initializeState(state: RuntimeState): RuntimeState {
  return {
    ...state,
    facts: Array.isArray(state.facts) ? [...state.facts] : [],
    clues: state.clues && typeof state.clues === "object" ? { ...state.clues } : {},
    relationships: Array.isArray(state.relationships) ? [...state.relationships] : [],
    conditions: Array.isArray(state.conditions) ? [...state.conditions] : [],
    used_material_ids: Array.isArray(state.used_material_ids) ? [...state.used_material_ids] : [],
    revealed_fact_ids: Array.isArray(state.revealed_fact_ids) ? [...state.revealed_fact_ids] : [],
    satisfied_reveal_gate_ids: Array.isArray(state.satisfied_reveal_gate_ids) ? [...state.satisfied_reveal_gate_ids] : [],
    social_beats: Array.isArray(state.social_beats) ? [...state.social_beats] : [],
    social_beats_in_segment: Number.isInteger(state.social_beats_in_segment) ? state.social_beats_in_segment : 0,
    turn_in_segment: Number.isInteger(state.turn_in_segment) ? state.turn_in_segment : 0,
    successful_turns_by_chapter: validTurnCounts(state.successful_turns_by_chapter),
    summary: typeof state.summary === "string" ? state.summary : "",
  };
}

export function normalizeWorkflow(value: CompiledWorkflow): CompiledWorkflow {
  const runtimePackage = {
    ...value.runtimePackage,
    runtime: {
      ...value.runtimePackage.runtime,
      chapter_progression: normalizeChapterProgression(value.runtimePackage, value.storyPackage),
    },
    state: initializeState(value.runtimePackage.state),
  };
  return { ...value, runtimePackage };
}

export function putWorkflow(sessionId: string, value: CompiledWorkflow) {
  workflowSessions.set(sessionId, normalizeWorkflow(value));
}

export function getWorkflow(sessionId: string) {
  return workflowSessions.get(sessionId);
}

export function getLatestWorkflowByTitle(title: string) {
  return [...workflowSessions.values()]
    .filter((workflow) => workflow.storyPackage.director_data.story.title === title)
    .sort((left, right) => right.createdAt - left.createdAt)[0];
}

export function commitFinaleWorkflow(current: CompiledWorkflow, choice: "destroy" | "preserve") {
  const finale = current.runtimePackage.runtime.finale_vote;
  const state = current.runtimePackage.state;
  if (!finale || state.current_segment !== finale.trigger_segment_id) {
    return { ok: false as const, reason: "finale_not_ready" as const };
  }
  if (state.finale_choice) return { ok: false as const, reason: "finale_already_decided" as const };
  const option = finale.options.find((entry) => entry.id === choice);
  if (!option) return { ok: false as const, reason: "finale_choice_invalid" as const };

  const nextState: RuntimeState = {
    ...state,
    version: state.version + 1,
    conditions: unique([...state.conditions, "player_final_vote_recorded", `ending_${choice}`]),
    finale_choice: choice,
    summary: `用户投出最后一票：${option.label}。${option.summary}`,
  };
  const nextWorkflow: CompiledWorkflow = {
    ...current,
    runtimePackage: { ...current.runtimePackage, state: nextState },
  };
  return { ok: true as const, finale, option, state: nextState, workflow: nextWorkflow };
}

export function commitFinaleDecision(sessionId: string, choice: "destroy" | "preserve") {
  const current = workflowSessions.get(sessionId);
  if (!current) return { ok: false as const, reason: "workflow_missing" as const };
  const result = commitFinaleWorkflow(current, choice);
  if (result.ok) workflowSessions.set(sessionId, result.workflow);
  return result;
}

/**
 * Compare-and-swap state commit. Validation happens before this function, but it
 * repeats the version, counter and adjacent-segment invariants so concurrent
 * requests can never partially mutate the canonical state.
 */
export function commitRuntimeWorkflow(current: CompiledWorkflow, expectedVersion: number, delta: StateDelta): StateCommit {
  const runtime = current.runtimePackage;
  const state = runtime.state;
  if (state.version !== expectedVersion) return { ok: false, reason: "state_version_conflict" };
  if (delta.turn_in_segment !== state.turn_in_segment + 1) return { ok: false, reason: "state_delta_invalid" };

  const currentSegment = runtime.segments.find((segment) => segment.id === state.current_segment);
  if (!currentSegment) return { ok: false, reason: "state_delta_invalid" };
  const chapterRule = chapterProgressionRule(runtime, currentSegment.chapter_id);
  const successfulTurns = state.successful_turns_by_chapter?.[currentSegment.chapter_id] ?? 0;
  if (successfulTurns >= chapterRule.max_successful_turns) return { ok: false, reason: "chapter_turn_limit_reached" };

  const newMaterialIds = unique(delta.used_material_ids ?? []);
  if (newMaterialIds.length > currentSegment.tempo_budget.max_materials_per_turn
    || newMaterialIds.some((id) => state.used_material_ids.includes(id) || !currentSegment.allowed_material_ids.includes(id))) {
    return { ok: false, reason: "state_delta_invalid" };
  }
  const advances = delta.segment_complete === true;
  if (advances && (!currentSegment.next || delta.next_segment !== currentSegment.next)) {
    return { ok: false, reason: "state_delta_invalid" };
  }
  if (!advances && delta.next_segment) return { ok: false, reason: "state_delta_invalid" };

  const resultingMaterials = new Set([...state.used_material_ids, ...newMaterialIds]);
  const resultingConditions = new Set([...state.conditions, ...(delta.conditions ?? [])]);
  if (advances) {
    const requiredForSegment = chapterRule.required_material_ids
      .filter((id) => currentSegment.allowed_material_ids.includes(id));
    const requiredSegmentConditions = unique([
      ...currentSegment.exit,
      ...currentSegment.scene_boundary.exit_conditions,
    ]);
    if (requiredForSegment.some((id) => !resultingMaterials.has(id))
      || requiredSegmentConditions.some((id) => !resultingConditions.has(id))) {
      return { ok: false, reason: "state_delta_invalid" };
    }

    const nextSegment = runtime.segments.find((segment) => segment.id === currentSegment.next);
    const chapterChanged = nextSegment?.chapter_id !== currentSegment.chapter_id;
    if (chapterChanged && (chapterRule.required_material_ids.some((id) => !resultingMaterials.has(id))
      || chapterRule.required_condition_ids.some((id) => !resultingConditions.has(id)))) {
      return { ok: false, reason: "state_delta_invalid" };
    }
  }

  const socialAdded = delta.social_beats_added ?? 0;
  if (!Number.isInteger(socialAdded) || socialAdded < 0 || socialAdded > 1) {
    return { ok: false, reason: "state_delta_invalid" };
  }

  const nextState: RuntimeState = {
    version: state.version + 1,
    current_segment: advances ? currentSegment.next! : state.current_segment,
    facts: unique([...state.facts, ...(delta.facts ?? [])]),
    clues: { ...state.clues, ...(delta.clues ?? {}) },
    relationships: unique([...state.relationships, ...(delta.relationships ?? [])]),
    conditions: unique([...state.conditions, ...(delta.conditions ?? [])]),
    used_material_ids: unique([...state.used_material_ids, ...(delta.used_material_ids ?? [])]),
    revealed_fact_ids: unique([...state.revealed_fact_ids, ...(delta.revealed_fact_ids ?? [])]),
    satisfied_reveal_gate_ids: unique([...state.satisfied_reveal_gate_ids, ...(delta.satisfied_reveal_gate_ids ?? [])]),
    social_beats: advances ? [] : unique([...state.social_beats, ...(delta.social_beats ?? [])]),
    social_beats_in_segment: advances ? 0 : state.social_beats_in_segment + socialAdded,
    turn_in_segment: advances ? 0 : delta.turn_in_segment,
    successful_turns_by_chapter: {
      ...validTurnCounts(state.successful_turns_by_chapter),
      [currentSegment.chapter_id]: successfulTurns + 1,
    },
    summary: delta.summary?.trim() || state.summary,
  };

  const nextWorkflow: CompiledWorkflow = {
    ...current,
    runtimePackage: { ...runtime, state: nextState },
  };
  return { ok: true, workflow: nextWorkflow, state: nextState };
}

export function commitRuntimeState(sessionId: string, expectedVersion: number, delta: StateDelta): StateCommit {
  const current = workflowSessions.get(sessionId);
  if (!current) return { ok: false, reason: "workflow_missing" };
  const result = commitRuntimeWorkflow(current, expectedVersion, delta);
  if (result.ok) workflowSessions.set(sessionId, result.workflow);
  return result;
}
