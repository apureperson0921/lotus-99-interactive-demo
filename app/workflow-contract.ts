/**
 * 后端三段式 workflow 的唯一交换格式。
 * Prompt 1 只产出 StoryPackage；Prompt 2 只产出 RuntimePackage；Prompt 3
 * 只读 RuntimePacket 并返回 TurnResult。所有跨阶段引用均使用稳定 id，便于后端验证。
 */

export type StoryEventType = "narration" | "action" | "dialogue" | "reaction";

export type PlayerInputKind = "action" | "speech" | "freeform" | "identity";

/**
 * Read-only context supplied to Prompt 3. It describes how the player entered
 * the scene without turning that description into model-owned canon or adding
 * anything to the model's output schema.
 */
export type PlayerInteractionContext = {
  profile: {
    description: string;
    source: "user_defined" | "default_presence";
    disclosure: "declared_now" | "already_public" | "not_declared";
  };
  current_input: {
    kind: PlayerInputKind;
    is_identity_introduction: boolean;
    first_identity_introduction: boolean;
  };
  recent_contributions: string[];
  npc_response_expectation: string;
  choice_expectation: string;
};

export type ArcPhase = "起" | "承" | "转" | "合";

export type EmotionalEngine = {
  core_wound: string;
  unmet_need: string;
  defense: string;
  false_belief: string;
  secret_desire: string;
  relational_trigger: string;
  transformation: string;
};

export type ChapterArc = {
  chapter_id: string;
  emotional_question: string;
  relationship_engine: string;
  beats: Record<ArcPhase, {
    dramatic_function: string;
    emotional_turn: string;
    relationship_turn: string;
    guiding_question: string;
  }>;
};

export type LockedOpeningEvent = {
  id: string;
  type: StoryEventType;
  person?: string;
  text: string;
  locked: true;
};

export type PlayerContract = {
  id: "player";
  role: "independent_participant";
  default_presence: string;
  identity_policy: "user_defined_only";
  user_owned_fields: string[];
  can: string[];
  cannot_replace: string[];
  choice_owner: "player";
  action_owner: "player";
  opening_choices: Array<{
    text: string;
    kind: "action" | "speech";
    owner: "player";
  }>;
  wildcard_speech: string[];
};

export type RelationshipRule = {
  id: string;
  participants: string[];
  canonical: string;
  public_summary?: string;
  known_by: string[];
  public_from_segment?: string;
  condition?: string;
  aliases_before_reveal: Record<string, string>;
};

export type RevealGate = {
  id: string;
  fact_ids: string[];
  known_by: string[];
  public_from_segment?: string;
  condition?: string;
  aliases_before_reveal: Record<string, string>;
  forbidden_reveals: string[];
};

export type CanonicalFact = {
  id: string;
  text: string;
  kind: "locked" | "clue" | "secret";
  known_by: string[];
  reveal_gate_id?: string;
  origin?: "source" | "authored_enrichment";
};

export type SegmentPlan = {
  id: string;
  chapter_id: string;
  label: string;
  location: string;
};

export type StoryPackage = {
  user_view: {
    chapter_outline: Array<{ id: string; title: string; synopsis: string }>;
    character_bios: Array<{ id: string; name: string; bio: string; public_from_segment?: string }>;
  };
  director_data: {
    story: { title: string; logline?: string; style: string; mode: string };
    characters: Array<{ id: string; source?: string; role: string; goal: string; relationships: string[]; emotional_engine: EmotionalEngine; arc?: string; secret?: string }>;
    chapter_arcs: ChapterArc[];
    player_contract: PlayerContract;
    opening: {
      trigger: string;
      activity: string;
      shock: string;
      consequence: string;
      locked_events: LockedOpeningEvent[];
    };
    fact_catalog: CanonicalFact[];
    relationship_rules: RelationshipRule[];
    reveal_gates: RevealGate[];
    segment_plan: SegmentPlan[];
    constraints: string[];
    endgame: { type: string; payoff: string; requirements: string[] };
  };
};

export type RuntimeMaterial = {
  id: string;
  detail: string;
  consequence: string;
  emotional_consequence?: string;
  relationship_effect?: string;
  fact_ids?: string[];
  reveal_gate_ids?: string[];
};

export type SceneBoundary = {
  entry: string;
  allowed_scope: string[];
  exit_conditions: string[];
  forbidden_transitions: string[];
};

export type DramaticBeat = {
  emotional_objective: string;
  pressure: string;
  turn: string;
};

export type ArcContract = {
  chapter_question: string;
  relationship_focus: string[];
  emotional_stakes: string;
  beats: Record<ArcPhase, {
    dramatic_function: string;
    emotional_turn: string;
    relationship_turn: string;
    guiding_question: string;
    choice_guidance: string;
  }>;
};

export type TempoBudget = {
  min_social_beats_before_plot_advance: number;
  required_social_beats: string[];
  max_materials_per_turn: number;
  max_major_changes_per_turn: number;
};

export type RuntimeSegment = {
  id: string;
  chapter_id: string;
  location: string;
  scene: string;
  open_questions?: string[];
  present: string[];
  scene_boundary: SceneBoundary;
  dramatic: DramaticBeat;
  arc_contract: ArcContract;
  tempo_budget: TempoBudget;
  materials: RuntimeMaterial[];
  allowed_fact_ids: string[];
  allowed_material_ids: string[];
  forbidden_reveal_ids: string[];
  progression: string;
  exit: string[];
  next?: string;
  join: string;
};

export type ResponseContract = {
  event_count: { min: 4; max: 7 };
  choices: {
    count: 2;
    allowed_kinds: Array<"action" | "speech">;
    forbidden_prefixes: string[];
  };
};

export type ChapterClueRewardDefinition =
  | {
    id: string;
    type: "image";
    title: string;
    caption: string;
    url: string;
    alt?: string;
    source_refs: string[];
  }
  | {
    id: string;
    type: "message";
    title: string;
    text: string;
    sender?: string;
    timestamp?: string;
    source_refs: string[];
  }
  | {
    id: string;
    type: "audio";
    title: string;
    url: string;
    transcript?: string;
    duration_seconds?: number;
    source_refs: string[];
  }
  | {
    id: string;
    type: "video";
    title: string;
    status?: "pending" | "ready";
    url?: string;
    poster?: string;
    caption?: string;
    source_refs: string[];
  }
  | {
    id: string;
    type: "document";
    title: string;
    author: string;
    subject: string;
    text: string;
    date?: string;
    source_refs: string[];
  };

export type ChapterTransitionMediaDefinition = {
  kind: "video" | "audio" | "image";
  title: string;
  status?: "pending" | "ready";
  url?: string;
  poster?: string;
  caption?: string;
};

export type ChapterEntryPromptDefinition = {
  chapter_id: string;
  title: string;
  prompt: string;
  image?: string;
  enter_label: string;
  wait_label: string;
  options?: Array<{
    id: string;
    label: string;
    description?: string;
    image?: string;
  }>;
};

export type FinaleVoteDefinition = {
  chapter_id: string;
  trigger_segment_id: string;
  title: string;
  question: string;
  votes: Array<{ person: string; position: "destroy" | "preserve"; statement: string }>;
  options: Array<{
    id: "destroy" | "preserve";
    label: string;
    summary: string;
    video: { title: string; status?: "pending" | "ready"; url?: string; poster?: string };
  }>;
};

export type ChapterCompletionDefinition = {
  chapter_id: string;
  reward: ChapterClueRewardDefinition;
  transition_media?: ChapterTransitionMediaDefinition;
};

export type ChapterProgressionRule = {
  chapter_id: string;
  /** Hard ceiling for committed turns; reaching it never completes a chapter by itself. */
  max_successful_turns: number;
  required_material_ids: string[];
  required_condition_ids: string[];
};

export type ChapterClueReward =
  | Omit<Extract<ChapterClueRewardDefinition, { type: "image" }>, "source_refs"> & { sourceRefs: string[] }
  | Omit<Extract<ChapterClueRewardDefinition, { type: "message" }>, "source_refs"> & { sourceRefs: string[] }
  | Omit<Extract<ChapterClueRewardDefinition, { type: "audio" }>, "source_refs"> & { sourceRefs: string[] }
  | Omit<Extract<ChapterClueRewardDefinition, { type: "video" }>, "source_refs"> & { sourceRefs: string[] }
  | Omit<Extract<ChapterClueRewardDefinition, { type: "document" }>, "source_refs"> & { sourceRefs: string[] };

export type ChapterCompletePayload = {
  chapterId: string;
  chapterNumber: number;
  title: string;
  reward: ChapterClueReward;
  transitionMedia?: {
    kind: "video" | "audio" | "image";
    title: string;
    status: "pending" | "ready";
    url?: string;
    poster?: string;
    caption?: string;
  };
};

export type RuntimeState = {
  version: number;
  current_segment: string;
  facts: string[];
  clues: Record<string, string>;
  relationships: string[];
  conditions: string[];
  used_material_ids: string[];
  revealed_fact_ids: string[];
  satisfied_reveal_gate_ids: string[];
  social_beats: string[];
  social_beats_in_segment: number;
  turn_in_segment: number;
  successful_turns_by_chapter?: Record<string, number>;
  finale_choice?: "destroy" | "preserve";
  summary: string;
};

export type RuntimePackage = {
  runtime: {
    style: string;
    player_contract: PlayerContract;
    response_contract: ResponseContract;
    chapter_completions?: ChapterCompletionDefinition[];
    chapter_entries?: ChapterEntryPromptDefinition[];
    chapter_progression?: ChapterProgressionRule[];
    finale_vote?: FinaleVoteDefinition;
    relationship_rules: RelationshipRule[];
    reveal_gates: RevealGate[];
    opening: {
      source: "user" | "generated";
      trigger: string;
      join_hint?: string;
      message: string;
      locked_events: LockedOpeningEvent[];
    };
    ending: { mode: string; type: string; requirements: string[] };
  };
  facts: {
    catalog: CanonicalFact[];
    locked: string[];
    clues: string[];
    secrets: string[];
  };
  characters: Array<{ id: string; card: string; knowledge?: { knows: string[]; does_not_know: string[] } }>;
  segments: RuntimeSegment[];
  state: RuntimeState;
};

export type StateDelta = {
  facts?: string[];
  clues?: Record<string, string>;
  relationships?: string[];
  conditions?: string[];
  used_material_ids?: string[];
  revealed_fact_ids?: string[];
  satisfied_reveal_gate_ids?: string[];
  social_beats?: string[];
  social_beats_added?: number;
  turn_in_segment?: number;
  summary?: string;
  segment_complete?: boolean;
  next_segment?: string;
};

export type TurnEvent = {
  type: StoryEventType;
  actor: "player" | "npc" | "environment";
  person?: string;
  addressed_to?: string;
  source_refs: string[];
  text: string;
  acknowledges_user_input?: boolean;
  relation_to_user: "ack" | "response" | "texture" | "change";
};

export type TurnChoice = {
  text: string;
  kind: "action" | "speech";
  owner: "player";
  anchor_event_index: number;
  source_refs: string[];
  arc_phase: ArcPhase;
  story_function: "deepen" | "pressure" | "reframe" | "commit";
};

export type TurnMetadata = {
  exact_user_input: string;
  user_action_owner: "player";
  current_location: string;
  current_arc_phase: ArcPhase;
  plot_advance: "none" | "minor" | "major";
  emotional_beat: { character_id: string; beat: string };
  distinct_npc_participants: string[];
};

export type TurnResult = {
  based_on_state_version: number;
  turn_metadata: TurnMetadata;
  events: TurnEvent[];
  choices: TurnChoice[];
  state_delta: StateDelta;
};
