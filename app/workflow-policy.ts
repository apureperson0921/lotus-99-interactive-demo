import type { Message } from "./story-data";
import type {
  ArcPhase,
  PlayerInputKind,
  PlayerInteractionContext,
  RuntimePackage,
  RuntimeSegment,
  StoryPackage,
  TurnChoice,
  TurnEvent,
  TurnMetadata,
  TurnResult,
} from "./workflow-contract";

type ValidationContext = {
  runtime: RuntimePackage;
  segment: RuntimeSegment;
  story: StoryPackage;
  history: Message[];
  userInput: string;
  inputKind: PlayerInputKind;
};

export type TurnValidation =
  | { ok: true; turn: TurnResult }
  | { ok: false; reason: string };

const eventTypes = new Set(["narration", "action", "dialogue", "reaction"]);

export function currentArcPhase(runtime: RuntimePackage, segment: RuntimeSegment): ArcPhase {
  if (runtime.state.turn_in_segment === 0) return "起";
  if (runtime.state.social_beats_in_segment < segment.tempo_budget.min_social_beats_before_plot_advance) return "承";
  const remainingMaterials = segment.materials.filter((material) => segment.allowed_material_ids.includes(material.id)
    && !runtime.state.used_material_ids.includes(material.id));
  return remainingMaterials.length > 1 ? "转" : "合";
}

function choiceFunctionsForPhase(phase: ArcPhase) {
  if (phase === "起") return ["deepen", "pressure"] as const;
  if (phase === "承") return ["deepen", "pressure"] as const;
  if (phase === "转") return ["pressure", "reframe"] as const;
  return ["reframe", "commit"] as const;
}

function normalizeGuardText(value: string) {
  return value.normalize("NFKC").toLocaleLowerCase().replace(/[\s\p{P}\p{S}]+/gu, "");
}

function containsGuardTerm(text: string, term: string) {
  const normalizedTerm = normalizeGuardText(term);
  return normalizedTerm.length >= 2 && normalizeGuardText(text).includes(normalizedTerm);
}

function uniqueStrings(value: unknown) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim()))];
}

function segmentPosition(runtime: RuntimePackage, segmentId?: string) {
  if (!segmentId) return Number.POSITIVE_INFINITY;
  const index = runtime.segments.findIndex((segment) => segment.id === segmentId);
  return index < 0 ? Number.POSITIVE_INFINITY : index;
}

function segmentReached(runtime: RuntimePackage, currentId: string, targetId?: string) {
  if (!targetId) return true;
  return segmentPosition(runtime, currentId) >= segmentPosition(runtime, targetId);
}

export function blockedRevealTerms(runtime: RuntimePackage, additionallySatisfied: string[] = []) {
  const satisfied = new Set([...runtime.state.satisfied_reveal_gate_ids, ...additionallySatisfied]);
  return [...new Set(runtime.runtime.reveal_gates
    .filter((gate) => !satisfied.has(gate.id))
    .flatMap((gate) => [
      ...gate.forbidden_reveals,
      ...runtime.facts.catalog.filter((fact) => gate.fact_ids.includes(fact.id)).map((fact) => fact.text),
    ])
    .filter((term) => term.trim().length >= 2))];
}

export function visibleCharacterIds(story: StoryPackage, runtime: RuntimePackage, segment: RuntimeSegment) {
  const currentId = runtime.state.current_segment;
  const publicIds = new Set(story.user_view.character_bios
    .filter((character) => segmentReached(runtime, currentId, character.public_from_segment))
    .map((character) => character.id));
  return segment.present.filter((id) => publicIds.has(id));
}

function publicFactIds(runtime: RuntimePackage) {
  const accepted = new Set([...runtime.state.facts, ...runtime.state.revealed_fact_ids]);
  for (const fact of runtime.facts.catalog) {
    if (!fact.reveal_gate_id && fact.kind === "locked" && fact.known_by.includes("player")) accepted.add(fact.id);
  }
  return accepted;
}

function publicRelationships(runtime: RuntimePackage) {
  const current = runtime.state.current_segment;
  return runtime.runtime.relationship_rules.flatMap((relationship) => {
    const reached = segmentReached(runtime, current, relationship.public_from_segment);
    const conditionMet = !relationship.condition || runtime.state.conditions.includes(relationship.condition);
    if (!reached || !conditionMet || !relationship.public_summary) return [];
    return [{ id: relationship.id, participants: relationship.participants, summary: relationship.public_summary }];
  });
}

function unlockedCharacterIds(story: StoryPackage, runtime: RuntimePackage, segment: RuntimeSegment) {
  return new Set(story.user_view.character_bios
    .filter((character) => segment.present.includes(character.id)
      || segmentReached(runtime, segment.id, character.public_from_segment))
    .map((character) => character.id));
}

function unlockedCharacterNames(story: StoryPackage, runtime: RuntimePackage, segment: RuntimeSegment) {
  const ids = unlockedCharacterIds(story, runtime, segment);
  return new Set(story.user_view.character_bios
    .filter((character) => ids.has(character.id))
    .map((character) => normalizeGuardText(character.name)));
}

function aliasesBeforeReveal(runtime: RuntimePackage, story: StoryPackage, segment: RuntimeSegment) {
  const satisfied = new Set(runtime.state.satisfied_reveal_gate_ids);
  const unlockedIds = unlockedCharacterIds(story, runtime, segment);
  return Object.fromEntries(runtime.runtime.reveal_gates
    .filter((gate) => !satisfied.has(gate.id))
    .flatMap((gate) => Object.entries(gate.aliases_before_reveal))
    .filter(([characterId]) => !unlockedIds.has(characterId)));
}

function recentTranscript(history: Message[], story: StoryPackage) {
  const names = new Map(story.user_view.character_bios.map((character) => [character.id, character.name]));
  return history.slice(-18).map((message) => {
    if (message.kind === "player") return `[玩家] ${message.text}`;
    if (message.kind === "system") return `[镜头] ${message.text}`;
    return `[${message.person ? names.get(message.person) || message.person : "现场"}] ${message.text}`;
  });
}

function playerInteractionContext(
  runtime: RuntimePackage,
  history: Message[],
  playerProfile: string | undefined,
  inputKind: PlayerInputKind,
): PlayerInteractionContext {
  const description = playerProfile?.trim() || runtime.runtime.player_contract.default_presence;
  const userDefined = Boolean(playerProfile?.trim());
  return {
    profile: {
      description,
      source: userDefined ? "user_defined" : "default_presence",
      disclosure: inputKind === "identity" ? "declared_now" : userDefined ? "already_public" : "not_declared",
    },
    current_input: {
      kind: inputKind,
      is_identity_introduction: inputKind === "identity",
      first_identity_introduction: inputKind === "identity",
    },
    recent_contributions: history
      .filter((message) => message.kind === "player")
      .slice(-4)
      .map((message) => message.text.trim())
      .filter(Boolean),
    npc_response_expectation: "前两个事件内至少一名NPC要把玩家当作具体的人来回应：可表现好奇、试探、配合、信任、质疑、关照或被触动；不能只处理案情，也不要机械复述身份标签。",
    choice_expectation: "两个选项都要像这个身份与已表现出的性格会说或会做的事；利用其合理能力和局限，但不得擅自新增履历、权限、知识或固定人格。",
  };
}

export function buildRuntimePacket(
  runtime: RuntimePackage,
  segment: RuntimeSegment,
  story: StoryPackage,
  history: Message[],
  playerProfile?: string,
  inputKind: PlayerInputKind = "freeform",
) {
  const segmentFactIds = new Set(segment.allowed_fact_ids);
  const facts = new Set([...publicFactIds(runtime)].filter((id) => segmentFactIds.has(id)));
  const present = new Set(segment.present);
  const plotUnlocked = runtime.state.social_beats_in_segment >= segment.tempo_budget.min_social_beats_before_plot_advance;
  const eligibleMaterials = plotUnlocked
    ? segment.materials.filter((material) => segment.allowed_material_ids.includes(material.id) && !runtime.state.used_material_ids.includes(material.id))
    : [];
  const currentArc = currentArcPhase(runtime, segment);
  const approvedMaterial = currentArc === "转"
    ? eligibleMaterials[0]
    : currentArc === "合"
      ? eligibleMaterials[eligibleMaterials.length - 1]
      : undefined;
  const directorCharacters = new Map(story.director_data.characters.map((character) => [character.id, character]));
  return {
    style: runtime.runtime.style,
    player_profile: playerProfile?.trim() || runtime.runtime.player_contract.default_presence,
    player_context: playerInteractionContext(runtime, history, playerProfile, inputKind),
    player_permissions: {
      can: runtime.runtime.player_contract.can,
      cannot_replace: runtime.runtime.player_contract.cannot_replace,
    },
    public_facts: runtime.facts.catalog.filter((fact) => facts.has(fact.id)).map(({ id, text, kind }) => ({ id, text, kind })),
    public_relationships: publicRelationships(runtime),
    aliases_before_reveal: aliasesBeforeReveal(runtime, story, segment),
    characters: runtime.characters
      .filter((character) => present.has(character.id))
      .map((character) => {
        const directorCharacter = directorCharacters.get(character.id);
        return {
          id: character.id,
          card: character.card,
          director_profile: directorCharacter ? {
            role: directorCharacter.role,
            goal: directorCharacter.goal,
            emotional_engine: directorCharacter.emotional_engine,
          } : undefined,
          director_knowledge_boundary: {
            knows: character.knowledge?.knows ?? [],
            does_not_know: character.knowledge?.does_not_know ?? [],
          },
        };
      }),
    segment: {
      id: segment.id,
      chapter_id: segment.chapter_id,
      location: segment.location,
      scene: segment.scene,
      present: segment.present,
      open_questions: segment.open_questions ?? [],
      allowed_scope: segment.scene_boundary.allowed_scope,
      forbidden_transitions: segment.scene_boundary.forbidden_transitions,
      progression: segment.progression,
      dramatic: segment.dramatic,
      relationship_focus: segment.arc_contract.relationship_focus,
      emotional_stakes: segment.arc_contract.emotional_stakes,
      current_beat: segment.arc_contract.beats[currentArc],
      approved_material: approvedMaterial ? {
        id: approvedMaterial.id,
        detail: approvedMaterial.detail,
        consequence: approvedMaterial.consequence,
        emotional_consequence: approvedMaterial.emotional_consequence,
        relationship_effect: approvedMaterial.relationship_effect,
      } : undefined,
    },
    memory: runtime.state.summary,
    recent_events: recentTranscript(history, story),
  };
}

export function runtimePolicyIssue(runtime: RuntimePackage, segment: RuntimeSegment) {
  const contract = runtime.runtime?.response_contract;
  if (!contract || contract.event_count?.min !== 4 || contract.event_count?.max !== 7) return "response_contract_missing";
  if (contract.choices?.count !== 2) return "response_choice_contract_invalid";
  if (!segment.location?.trim() || new Set(segment.present).size < 2) return "segment_location_or_cast_invalid";
  if (!segment.scene_boundary || !Array.isArray(segment.scene_boundary.allowed_scope) || !Array.isArray(segment.scene_boundary.exit_conditions)) return "scene_boundary_missing";
  if (!segment.arc_contract || !segment.arc_contract.beats
    || !(["起", "承", "转", "合"] as ArcPhase[]).every((phase) => segment.arc_contract.beats[phase]?.dramatic_function?.trim()
      && segment.arc_contract.beats[phase]?.emotional_turn?.trim()
      && segment.arc_contract.beats[phase]?.relationship_turn?.trim()
      && segment.arc_contract.beats[phase]?.guiding_question?.trim()
      && segment.arc_contract.beats[phase]?.choice_guidance?.trim())) return "arc_contract_missing";
  if (!segment.tempo_budget || !Number.isInteger(segment.tempo_budget.min_social_beats_before_plot_advance) || segment.tempo_budget.min_social_beats_before_plot_advance < 1) return "tempo_budget_invalid";
  if (!Array.isArray(segment.allowed_fact_ids) || !Array.isArray(segment.allowed_material_ids) || !Array.isArray(segment.forbidden_reveal_ids)) return "segment_allowlists_missing";
  if (segment.allowed_material_ids.some((id) => !segment.materials.some((material) => material.id === id))) return "segment_material_missing";
  if (!Array.isArray(runtime.state.social_beats) || !Number.isInteger(runtime.state.social_beats_in_segment) || !Number.isInteger(runtime.state.turn_in_segment)) return "runtime_state_protocol_missing";
  if (!Array.isArray(runtime.runtime.reveal_gates) || !Array.isArray(runtime.facts.catalog)) return "knowledge_or_reveal_policy_missing";
  return undefined;
}

type DraftEvent = Pick<TurnEvent, "type" | "person" | "text">;

function parseDraftEvent(value: unknown, present: Set<string>): DraftEvent | undefined {
  if (!value || typeof value !== "object") return;
  const item = value as Record<string, unknown>;
  if (typeof item.type !== "string" || !eventTypes.has(item.type)) return;
  if (typeof item.text !== "string" || !item.text.trim() || item.text.length > 320) return;
  const person = typeof item.person === "string" && item.person.trim() ? item.person.trim() : undefined;
  if (person && !present.has(person)) return;
  if (item.type === "dialogue" && !person) return;
  if (item.type === "narration" && person) return;
  return {
    type: item.type as TurnEvent["type"],
    ...(person ? { person } : {}),
    text: item.text.trim(),
  };
}

function parseChoice(value: unknown, index: number, expectedPhase: ArcPhase, events: TurnEvent[]): TurnChoice | undefined {
  if (!value || typeof value !== "object") return;
  const item = value as Record<string, unknown>;
  if (typeof item.text !== "string" || !item.text.trim() || item.text.trim().length > 24) return;
  if (item.kind !== "action" && item.kind !== "speech") return;
  const anchorEventIndex = events.map((event, eventIndex) => ({ event, eventIndex })).reverse()
    .find(({ event }) => event.actor === "npc")?.eventIndex ?? Math.max(0, events.length - 1);
  const functions = choiceFunctionsForPhase(expectedPhase);
  return {
    text: item.text.trim(),
    kind: item.kind,
    owner: "player",
    anchor_event_index: anchorEventIndex,
    source_refs: [`turn_event:${anchorEventIndex}`],
    arc_phase: expectedPhase,
    story_function: functions[Math.min(index, functions.length - 1)],
  };
}

function namesInStory(story: StoryPackage) {
  return story.user_view.character_bios.map((character) => character.name).filter((name) => name.length >= 2);
}

export function validateAndNormalizeTurn(value: unknown, context: ValidationContext): TurnValidation {
  if (!value || typeof value !== "object") return { ok: false, reason: "turn_not_object" };
  const item = value as Record<string, unknown>;
  const expectedArcPhase = currentArcPhase(context.runtime, context.segment);

  const rawEvents = Array.isArray(item.events) ? item.events : [];
  const { min, max } = context.runtime.runtime.response_contract.event_count;
  if (rawEvents.length < min || rawEvents.length > max) return { ok: false, reason: `event_count_must_be_${min}_to_${max}` };
  const present = new Set(context.segment.present);
  const plotUnlocked = context.runtime.state.social_beats_in_segment >= context.segment.tempo_budget.min_social_beats_before_plot_advance;
  const eligibleMaterials = plotUnlocked
    ? context.segment.materials.filter((material) => context.segment.allowed_material_ids.includes(material.id)
      && !context.runtime.state.used_material_ids.includes(material.id))
    : [];
  const approvedMaterial = expectedArcPhase === "转"
    ? eligibleMaterials[0]
    : expectedArcPhase === "合"
      ? eligibleMaterials[eligibleMaterials.length - 1]
      : undefined;
  if (expectedArcPhase === "转" && !approvedMaterial) return { ok: false, reason: "arc_turn_has_no_material" };
  const drafts = rawEvents.map((event) => parseDraftEvent(event, present));
  if (drafts.some((event) => !event)) return { ok: false, reason: "event_shape_or_person_invalid" };
  const acceptedDrafts = drafts as DraftEvent[];
  // Prompt 3 owns prose quality. The backend records the first NPC beat as the
  // response anchor instead of trying to infer emotion from a keyword list.
  const playerResponseIndex = Math.max(0, acceptedDrafts.findIndex((event) => event.person));
  const firstNpcIndex = acceptedDrafts.findIndex((event) => event.person);
  const lastNpcIndex = acceptedDrafts.map((event, index) => ({ event, index })).reverse().find(({ event }) => event.person)?.index ?? -1;
  const acceptedEvents: TurnEvent[] = acceptedDrafts.map((event, index) => {
    const actor: TurnEvent["actor"] = event.person
      ? "npc"
      : index === 0 && context.inputKind === "action" && event.type === "action" ? "player" : "environment";
    const relation: TurnEvent["relation_to_user"] = index === 0
      ? event.person && index === playerResponseIndex ? "response" : "ack"
      : event.person && (index === playerResponseIndex || index === firstNpcIndex) ? "response"
        : event.person && index === lastNpcIndex ? "change" : "texture";
    return {
      ...event,
      actor,
      ...(index === playerResponseIndex ? { addressed_to: "player" } : {}),
      source_refs: uniqueStrings([
        "segment",
        ...(index === 0 ? ["user_action"] : []),
        ...(event.person ? [`character:${event.person}`, "recent_events"] : []),
        ...(approvedMaterial ? [approvedMaterial.id] : []),
      ]),
      acknowledges_user_input: index === playerResponseIndex || (index === 0 && actor === "player"),
      relation_to_user: relation,
    };
  });
  if (approvedMaterial?.id === "m_ch02_s03_song") {
    const cueScenePresent = acceptedEvents.some((event, index, events) => {
      const nearby = events.slice(index, index + 3).map((entry) => entry.text).join(" ");
      return /(旧音响|壁挂音响|扬声器|琴声|歌曲|旋律|电流爆音|合成琴)/.test(event.text)
        && /(艾琳|她)/.test(nearby)
        && /(听见|听到|认出|僵住|僵在|手电|弟弟)/.test(nearby);
    });
    if (!cueScenePresent) return { ok: false, reason: "childhood_song_scene_missing" };
  }
  // A character does not need to be physically present to be discussable.
  // Names already spoken in the visible transcript (for example the missing
  // person named in the opening Vlog) are established player knowledge. Keep
  // blocking genuinely future names, but do not mistake an off-screen subject
  // of the current investigation for an unrevealed character.
  const visibleBeforeTurn = [
    context.userInput,
    ...context.history.map((message) => message.text),
    approvedMaterial?.detail ?? "",
  ].join("\n");
  const unreachedCharacterNames = context.story.user_view.character_bios
    .filter((character) => !present.has(character.id)
      && !segmentReached(context.runtime, context.segment.id, character.public_from_segment)
      && !containsGuardTerm(visibleBeforeTurn, character.name))
    .map((character) => character.name)
    .filter((name) => name.trim().length >= 2);
  if (acceptedEvents.some((event) => unreachedCharacterNames.some((name) => containsGuardTerm(event.text, name)))) {
    return { ok: false, reason: "event_mentions_unseen_character" };
  }
  const participants = [...new Set(acceptedEvents.flatMap((event) => event.actor === "npc" && event.person ? [event.person] : []))];
  const dialogueSpeakers = [...new Set(acceptedEvents.flatMap((event) => event.type === "dialogue" && event.person ? [event.person] : []))];

  const rawChoices = Array.isArray(item.choices) ? item.choices : [];
  if (rawChoices.length !== 2) return { ok: false, reason: "exactly_two_choices_required" };
  const choices = rawChoices.map((choice, index) => parseChoice(choice, index, expectedArcPhase, acceptedEvents));
  if (choices.some((choice) => !choice)) return { ok: false, reason: "choice_shape_invalid" };
  const acceptedChoices = choices as TurnChoice[];
  if (acceptedChoices[0].text === acceptedChoices[1].text) return { ok: false, reason: "choices_must_differ" };
  const forbiddenPrefixes = context.runtime.runtime.response_contract.choices.forbidden_prefixes;
  if (acceptedChoices.some((choice) => forbiddenPrefixes.some((prefix) => choice.text.startsWith(prefix)))) return { ok: false, reason: "choice_has_player_prefix" };
  const characterNames = namesInStory(context.story);
  if (acceptedChoices.some((choice) => choice.kind === "action" && characterNames.some((name) => choice.text.startsWith(`${name}：`) || choice.text.startsWith(`${name}:`)))) return { ok: false, reason: "choice_assigns_npc_action" };
  const introducedThisTurn = [context.userInput, ...acceptedEvents.map((event) => event.text)].join("\n");
  const unseenCharacterNames = context.story.user_view.character_bios
    .filter((character) => !present.has(character.id))
    .map((character) => character.name)
    .filter((name) => name.trim().length >= 2 && !containsGuardTerm(introducedThisTurn, name));
  if (acceptedChoices.some((choice) => unseenCharacterNames.some((name) => containsGuardTerm(choice.text, name)))) {
    return { ok: false, reason: "choice_mentions_unseen_character" };
  }
  const nextSocialBeat = context.segment.tempo_budget.required_social_beats
    .find((beat) => !context.runtime.state.social_beats.includes(beat));
  const socialBeats = (expectedArcPhase === "起" || expectedArcPhase === "承") && nextSocialBeat ? [nextSocialBeat] : [];
  const socialAdded = socialBeats.length;
  const usedMaterials = approvedMaterial ? [approvedMaterial.id] : [];
  const materialChainComplete = context.segment.allowed_material_ids.every((id) => context.runtime.state.used_material_ids.includes(id)
    || usedMaterials.includes(id));
  const completesSegment = expectedArcPhase === "合" && materialChainComplete && Boolean(context.segment.next);
  const conditions = completesSegment
    ? uniqueStrings([...context.segment.exit, ...context.segment.scene_boundary.exit_conditions])
    : [];
  const gateMaterials = approvedMaterial
    ? [approvedMaterial]
    : expectedArcPhase === "合"
      ? context.segment.materials.filter((material) => context.runtime.state.used_material_ids.includes(material.id))
      : [];
  const candidateGateIds = uniqueStrings(gateMaterials.flatMap((material) => material.reveal_gate_ids ?? []));
  const proposedGateIds = candidateGateIds.filter((gateId) => {
    const gate = context.runtime.runtime.reveal_gates.find((entry) => entry.id === gateId);
    if (!gate || context.segment.forbidden_reveal_ids.includes(gateId)) return false;
    if (!segmentReached(context.runtime, context.segment.id, gate.public_from_segment)) return false;
    return !gate.condition || context.runtime.state.conditions.includes(gate.condition) || conditions.includes(gate.condition);
  });
  const satisfiedGateIds = new Set([...context.runtime.state.satisfied_reveal_gate_ids, ...proposedGateIds]);
  const materialFactIds = approvedMaterial?.fact_ids ?? [];
  const facts = materialFactIds.filter((id) => {
    if (!context.segment.allowed_fact_ids.includes(id)) return false;
    const fact = context.runtime.facts.catalog.find((entry) => entry.id === id);
    return Boolean(fact && (!fact.reveal_gate_id || satisfiedGateIds.has(fact.reveal_gate_id)));
  });
  const revealedFactIds = uniqueStrings(proposedGateIds.flatMap((gateId) => context.runtime.runtime.reveal_gates
    .find((gate) => gate.id === gateId)?.fact_ids ?? []))
    .filter((id) => context.segment.allowed_fact_ids.includes(id));
  const clues = approvedMaterial
    ? Object.fromEntries(facts.filter((id) => context.runtime.facts.clues.includes(id)).map((id) => [id, approvedMaterial.detail.slice(0, 180)]))
    : {};
  const turnSummary = acceptedEvents.map((event) => event.text).join(" ");
  const combinedSummary = [context.runtime.state.summary.trim(), turnSummary].filter(Boolean).join(" ");
  const summary = combinedSummary.slice(Math.max(0, combinedSummary.length - 360));

  const guardedText = [...acceptedEvents.map((event) => event.text), ...acceptedChoices.map((choice) => choice.text), summary, ...Object.values(clues)].join("\n");
  // A reveal gate may still protect a character's deeper role or relationships
  // after that character has already entered the public scene. In that case the
  // character's display name is ordinary dialogue vocabulary, not a spoiler.
  // Keep guarding the actual claims (for example who the character works with),
  // but never invalidate a whole turn merely for naming an unlocked character.
  const publicNames = unlockedCharacterNames(context.story, context.runtime, context.segment);
  const blocked = blockedRevealTerms(context.runtime, proposedGateIds)
    .filter((term) => !publicNames.has(normalizeGuardText(term)))
    .find((term) => containsGuardTerm(guardedText, term));
  if (blocked) return { ok: false, reason: `unrevealed_term:${blocked.slice(0, 24)}` };
  const metadata: TurnMetadata = {
    exact_user_input: context.userInput,
    user_action_owner: "player",
    current_location: context.segment.location,
    current_arc_phase: expectedArcPhase,
    plot_advance: completesSegment ? "major" : approvedMaterial ? "minor" : "none",
    emotional_beat: {
      character_id: dialogueSpeakers[0] ?? participants[0] ?? context.segment.present[0],
      beat: context.segment.arc_contract.beats[expectedArcPhase].emotional_turn.slice(0, 140),
    },
    distinct_npc_participants: participants,
  };

  return {
    ok: true,
    turn: {
      based_on_state_version: context.runtime.state.version,
      turn_metadata: metadata,
      events: acceptedEvents,
      choices: acceptedChoices,
      state_delta: {
        facts,
        clues,
        relationships: [],
        conditions,
        used_material_ids: usedMaterials,
        revealed_fact_ids: revealedFactIds,
        satisfied_reveal_gate_ids: proposedGateIds,
        social_beats: socialBeats,
        social_beats_added: socialAdded,
        turn_in_segment: context.runtime.state.turn_in_segment + 1,
        summary,
        segment_complete: completesSegment,
        ...(completesSegment && context.segment.next ? { next_segment: context.segment.next } : {}),
      },
    },
  };
}
