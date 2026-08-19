import type {
  ArcContract,
  ArcPhase,
  CanonicalFact,
  ChapterArc,
  LockedOpeningEvent,
  PlayerContract,
  RelationshipRule,
  RevealGate,
  RuntimePackage,
  RuntimeSegment,
  SegmentPlan,
  StoryPackage,
} from "./workflow-contract";
import { workflowSource } from "./workflow-source";

function clone<T>(value: unknown): T {
  return structuredClone(value) as T;
}

function unique(values: string[]) {
  return [...new Set(values)];
}

function tempo(required_social_beats: string[]) {
  return {
    min_social_beats_before_plot_advance: 2,
    required_social_beats: required_social_beats.slice(0, 2),
    max_materials_per_turn: 1,
    max_major_changes_per_turn: 1,
  } as const;
}

function segmentArc(
  chapterArc: ChapterArc,
  relationship_focus: string[],
  emotional_stakes: string,
  choice_guidance: string,
  dramaticFunctions: Record<ArcPhase, string>,
): ArcContract {
  return {
    chapter_question: chapterArc.emotional_question,
    relationship_focus,
    emotional_stakes,
    beats: Object.fromEntries((["起", "承", "转", "合"] as ArcPhase[]).map((phase) => [phase, {
      dramatic_function: dramaticFunctions[phase],
      emotional_turn: chapterArc.beats[phase].emotional_turn,
      relationship_turn: chapterArc.beats[phase].relationship_turn,
      guiding_question: chapterArc.beats[phase].guiding_question,
      choice_guidance,
    }])) as ArcContract["beats"],
  };
}

export function createPrecompiledWorkflow(): { storyPackage: StoryPackage; runtimePackage: RuntimePackage } {
  const source = workflowSource.storyCard;
  const playerContract = clone<PlayerContract>(source.playerContract);
  const lockedEvents = clone<LockedOpeningEvent[]>(source.opening.locked_events);
  const facts = clone<CanonicalFact[]>(source.factCatalog);
  const relationships = clone<RelationshipRule[]>(source.relationshipRules);
  const revealGates = clone<RevealGate[]>(source.revealGates);
  const segmentPlan = clone<SegmentPlan[]>(source.segmentPlan);
  const chapterArcs: ChapterArc[] = [
    {
      chapter_id: "ch01",
      emotional_question: "当一个陌生人的求救碰到自己最不敢触碰的旧伤，人还愿不愿意认真看见她？",
      relationship_engine: "玛雅的丧母触到艾琳处理失踪案时不肯公开的旧伤；哈罗德用专业而具体的风险控制争取时间，每一道正确指令都藏着没有说出的前提；米勒用笑话替艾琳挡下一部分压力。",
      beats: {
        起: { dramatic_function: "让玛雅从怪视频里的脸变成一个有家可回的人。", emotional_turn: "好奇变成在意。", relationship_turn: "玩家第一次选择相信、质疑或照顾谁。", guiding_question: "这段视频背后究竟是恶作剧，还是一个人留下的求救？" },
        承: { dramatic_function: "让三人的办案立场碰到各自不愿承认的私人原因。", emotional_turn: "争论真假变成争论今夜应当承担哪一种风险。", relationship_turn: "艾琳逼哈罗德给出可执行的边界，哈罗德借每个问题测量她掌握了多少。", guiding_question: "一个上级是在谨慎保护人，还是借谨慎保护自己的秘密？" },
        转: { dramatic_function: "用可复核的生活痕迹证明玛雅主动留下了路线。", emotional_turn: "怀疑转成共同承担。", relationship_turn: "证据迫使哈罗德从阻止调查改为授权一次范围受控的核查。", guiding_question: "她为什么去，又想让谁找到她？" },
        合: { dramatic_function: "让身份不明的白发修理工进入监控，形成下一章行动理由。", emotional_turn: "现场扑空后，现实证据重新给出方向。", relationship_turn: "艾琳与米勒在哈罗德划出的边界之外继续一步，而哈罗德留在警局执行自己的安排。", guiding_question: "找到这个人时，他们该把他当证人还是嫌疑人？" },
      },
    },
    {
      chapter_id: "ch02",
      emotional_question: "当一个陌生人故意把你引错，下一次接近真相还要不要按他的规则来？",
      relationship_engine: "白发修理工用拒绝和误导控制距离；艾琳因弟弟的歌曲失去职业上的冷静，米勒必须决定是拦住她，还是相信她的私人判断。",
      beats: {
        起: { dramatic_function: "让白发修理工明确拒绝放行，并让拒绝听起来像一种掌控。", emotional_turn: "找到证人的希望变成被挡在门外的恼火。", relationship_turn: "艾琳与米勒第一次为是否强闯产生分歧。", guiding_question: "他是在保护里面的人，还是在替某人拖时间？" },
        承: { dramatic_function: "让众人强行进入，却只撞见一个被安排好的空场。", emotional_turn: "行动的痛快迅速变成受骗后的难堪。", relationship_turn: "队伍必须承认强硬没有让他们更接近玛雅。", guiding_question: "他们闯进来的究竟是入口，还是一个专门留给追查者的空壳？" },
        转: { dramatic_function: "用丹尼尔亲手做过的童年歌曲打破一无所获。", emotional_turn: "艾琳从挫败骤然转为希望与失控。", relationship_turn: "她第一次要求同伴相信一个无法立刻证明的私人记忆。", guiding_question: "只有丹尼尔知道的歌为什么会从这里响起？" },
        合: { dramatic_function: "让疑似零点的身影避开艾琳，并由米勒叫停今晚行动、拿出两套Cosplay服装。", emotional_turn: "希望没有得到确认；艾琳被迫停下，米勒用荒唐计划替她保住下一次机会。", relationship_turn: "米勒选择相信艾琳的私人记忆，却不再允许她独自失控地追进去。", guiding_question: "多比还是银河护卫队——下一次，他们愿意丢掉多少体面换一个真正入口？" },
      },
    },
    {
      chapter_id: "ch03",
      emotional_question: "当终于进入真正的Lotus并找到失踪者，真相会把寻找者带回现实，还是带向更深的执念？",
      relationship_engine: "潜伏与乔装要求众人暂时放下警察身份；找到玛雅后，沃德的规则把救人变成选择问题，零点的身份则把艾琳的职业判断彻底变成姐弟关系。",
      beats: {
        起: { dramatic_function: "承接玩家选择的Cosplay服装，用不同的互相拆台开场，再让两套方案都顺利进入真正俱乐部。", emotional_turn: "上一章的失控在一场不合时宜的玩笑里松开半步。", relationship_turn: "玩家、艾琳与米勒共同承担这套丢脸但有效的办法。", guiding_question: "穿过门以后，他们还能不能分清哪些只是服装、哪些愿望已经成为现实？" },
        承: { dramatic_function: "让真正营业的俱乐部与第一次空场形成反差；奇观先好笑，再显出每个人不肯醒来的伤口，最终把众人引到玛雅面前。", emotional_turn: "猎奇和兴奋变成面对他人愿望的谨慎。", relationship_turn: "玛雅不再是被动线索，而是必须被听见的人。", guiding_question: "找到她以后，谁有权替她决定离开？" },
        转: { dramatic_function: "让众人再次找到白发老人，由他公开姓名并说明入口的基本规则。", emotional_turn: "被骗的愤怒碰上一个并不完全恶意的解释。", relationship_turn: "艾琳与沃德从追捕关系进入价值冲突。", guiding_question: "他给的是选择，还是一扇会伤到旁人的门？" },
        合: { dramatic_function: "让艾琳把歌曲、躲避和当面对质拼成确认，零点揭面为丹尼尔。", emotional_turn: "职业追查落到至亲本人身上。", relationship_turn: "艾琳所有原则开始由弟弟亲自检验。", guiding_question: "确定他是谁以后，她还能只把他当成等待营救的人吗？" },
      },
    },
    {
      chapter_id: "ch04",
      emotional_question: "爱一个人，是把他带回自己认定的现实，还是承认他选择了不同的人生？",
      relationship_engine: "丹尼尔用共同童年邀请姐姐留下；艾琳的爱与控制只隔一线，哈罗德和沃德各自把逃避包装成秩序或自由。",
      beats: {
        起: { dramatic_function: "先给姐弟一次近乎正常的重逢。", emotional_turn: "愤怒被熟悉感击穿。", relationship_turn: "警探与目标重新变回姐姐与弟弟。", guiding_question: "他们还能不能像三年前那样说话？" },
        承: { dramatic_function: "让丹尼尔说出主动留下的理由。", emotional_turn: "受害者叙事被他自己的选择推翻。", relationship_turn: "姐弟的爱开始要求对方背叛自己的世界。", guiding_question: "谁才是在要求谁放弃人生？" },
        转: { dramatic_function: "让哈罗德承认长期默许，把私人选择推向公共责任。", emotional_turn: "所有人发现所谓保护也可能是在替别人作决定。", relationship_turn: "不同立场被迫承认各自方案伤害了谁。", guiding_question: "个人自由在哪里变成对他人的强迫？" },
        合: { dramatic_function: "争论结束后才从旧设备后取出封存信封；正文留到章节结算展开。", emotional_turn: "争辩转成一份必须共同面对的证据。", relationship_turn: "艾琳、哈罗德与米勒将不得不依据证据公开投票。", guiding_question: "看见沃德留下的完整论述后，他们愿意为哪一种代价负责？" },
      },
    },
    {
      chapter_id: "ch05",
      emotional_question: "最后一票属于用户时，要为哪一种失去负责？",
      relationship_engine: "艾琳先讲清丹尼尔从小为何总想修好无法修好的东西；哈罗德与米勒随后围绕共同现实和个人选择正面交锋，直到两票僵持后才由用户决定唯一结局。",
      beats: {
        起: { dramatic_function: "艾琳停止继续调查，先讲丹尼尔童年里反复出现的拯救冲动。", emotional_turn: "一个看似宏大的选择重新落回一个具体的人。", relationship_turn: "她不替弟弟辩护，也拒绝把他简化成故障。", guiding_question: "丹尼尔为什么会把无法救人当成自己的失败？" },
        承: { dramatic_function: "让童年故事解释丹尼尔的选择，再让哈罗德与米勒逐层拆解彼此方案。", emotional_turn: "理解一个人不再等于同意他的决定。", relationship_turn: "旧上级与搭档开始为自己愿意牺牲的人负责。", guiding_question: "摧毁和保留分别会抹掉谁的选择？" },
        转: { dramatic_function: "哈罗德与米勒经过数轮辩论后正式投出相反票。", emotional_turn: "两边都不再是轻松答案。", relationship_turn: "他们把无法替用户承担的部分留给最后一票。", guiding_question: "哪一种损失更不能接受？" },
        合: { dramatic_function: "根据最后一票播放唯一对应结局视频。", emotional_turn: "选择获得不可撤回的后果。", relationship_turn: "故事不再追加第三种折中答案。", guiding_question: "这个结局留下了什么？" },
      },
    },
  ];

  const storyPackage: StoryPackage = {
    user_view: {
      chapter_outline: clone(source.chapters),
      character_bios: [
        { id: "erin", name: "艾琳", bio: "失踪案警探，冷静敏锐，对失踪者和时间线有近乎固执的耐心。", public_from_segment: "ch01_s01" },
        { id: "harold", name: "哈罗德", bio: "纽约第七分局局长，老派、克制、经验老到；他会先保住人、证据和行动边界，再决定哪些理由可以说。", public_from_segment: "ch01_s01" },
        { id: "miller", name: "米勒", bio: "艾琳的搭档，巴尔的摩长大，嘴快脾气快，用玩笑顶住坏消息。", public_from_segment: "ch01_s01" },
        { id: "maya", name: "玛雅", bio: "二十四岁的夜生活Vlog博主。习惯隔着镜头观察别人。", public_from_segment: "ch03_s02" },
        { id: "ward", name: "沃德", bio: "与Lotus 99有关的白发修理工，温和耐心，但从不一次把话说全；第二章只能以白发修理工的公开别名出现，姓名要到真正俱乐部里再次找到他后公开。", public_from_segment: "ch02_s01" },
        { id: "daniel", name: "丹尼尔", bio: "艾琳失踪三年的弟弟。三年前进入Lotus 99后再未回到现实，目前行踪不明。", public_from_segment: "ch02_s03" },
      ],
    },
    director_data: {
      story: {
        title: source.title,
        logline: source.premise,
        mode: "finite",
        style: source.style,
      },
      characters: [
        { id: "erin", source: "existing_bot", role: "调查方向与现实立场", goal: "找到玛雅与丹尼尔，同时守住无辜者选择现实的权利", relationships: ["rel_erin_miller", "rel_erin_harold", "rel_erin_daniel"], emotional_engine: { core_wound: "弟弟失踪后三年没有答案", unmet_need: "承认爱不等于把对方带回自己身边", defense: "把悲伤变成时间线、程序和行动", false_belief: "只要找到足够多事实，就能把一切恢复原状", secret_desire: "让丹尼尔像三年前一样回家", relational_trigger: "任何人把失踪者概括成自愿离开或不值得寻找", transformation: "学会尊重弟弟的选择，同时守住没得选的人的现实" }, arc: "从执意带弟弟回来，走向尊重他的选择但不放弃现实", secret: "她害怕真正见到弟弟时自己会选择留下" },
        { id: "harold", source: "existing_bot", role: "聪明的风险控制者与秩序代价", goal: "把调查限制在可控范围：保住警员、原始证据和警局，同时把艾琳拖过凌晨三点的危险窗口并暗中维持Lotus现状", relationships: ["rel_erin_harold", "rel_miller_harold", "rel_harold_ward"], emotional_engine: { core_wound: "见过制度救不了的人，也见过自以为正确的行动把更多人送进危险", unmet_need: "承认维持秩序不能替别人决定人生", defense: "把阻拦写成具体可执行的证据保全、人员分工和安全边界；用提问判断别人知道多少，而不是假装自己不知道", false_belief: "只要把危险限制在少数知情者和短暂窗口里，长期隐瞒仍然算一种保护", secret_desire: "让艾琳活着回到一桩普通案子，也让分局继续像什么都没坏一样运转", relational_trigger: "艾琳把他的谨慎直接叫作懦弱，或有人拿警员性命赌一个尚未核实的猜测", transformation: "从替所有人安排安全的谎言，走向公开真相并承担自己的选择" }, arc: "从用聪明手段维持错误平衡，走向公开承担隐瞒后果的人", secret: "他知道Lotus、危险窗口与白发修理工；第一章故意先做桌面核查以拖过窗口，取得地址后让行动保持小规模，并在调查组离开后准备私下联络修理工" },
        { id: "miller", source: "existing_bot", role: "搭档、街头直觉与群戏减压阀", goal: "护住艾琳，同时证明不对劲的细节不是集体发疯", relationships: ["rel_erin_miller", "rel_miller_harold"], emotional_engine: { core_wound: "见过太多人把恐惧伪装成强硬，也见过搭档为案子耗尽自己", unmet_need: "允许自己认真害怕而不必先拿它开玩笑", defense: "插科打诨、先发脾气、把关心伪装成嫌麻烦", false_belief: "只要现场还能笑，就还没真正失控", secret_desire: "让艾琳活着走出每一个她非进不可的门", relational_trigger: "上级把人当数字，或艾琳独自承担风险", transformation: "从用笑话躲避恐惧到公开站队并承担后果" }, arc: "从用笑话躲避恐惧到在关键处公开站队" },
        { id: "maya", source: "existing_bot", role: "失踪者视角与自主选择", goal: "弄清自己在Lotus看到的东西，也保住由自己决定留下或离开的权利", relationships: [], emotional_engine: { core_wound: "母亲离世后，身边的人总急着替她决定怎样才算走出来", unmet_need: "被当成能够作出选择的成年人", defense: "躲在镜头和玩笑后观察别人", false_belief: "只要把经历拍下来，就不必当面承认自己真正想要什么", secret_desire: "再见母亲一次，又不想让父亲承受第二次失去", relational_trigger: "别人把她当证物、受害者或需要被带走的人", transformation: "从用镜头隔开自己，走向亲口承担自己的选择" }, arc: "从被寻找的目标变成能反过来质问寻找者的人" },
        { id: "ward", source: "existing_bot", role: "Lotus修理工与选择的守门人", goal: "让绝望者拥有离开现实的出口", relationships: ["rel_harold_ward", "rel_ward_daniel"], emotional_engine: { core_wound: "长期倾听人们在现实里无法修好的失去", unmet_need: "承认提供出口也要对出口伤到的人负责", defense: "永远温和、只给选择、不说完整代价", false_belief: "只要没有强迫，后果就不属于守门人", secret_desire: "证明梦境比现实更仁慈", relational_trigger: "别人把留下者简单称作软弱或受骗", transformation: "承认自由选择需要边界与共同责任" }, arc: "被迫承认个人选择也会伤害没有选择的人", secret: "他接受梦境会逐步覆盖现实的代价" },
        { id: "daniel", source: "existing_bot", role: "失踪者、匿名DJ与艾琳的核心抉择", goal: "留在自己认为更有意义的梦境，也希望姐姐理解甚至加入", relationships: ["rel_erin_daniel", "rel_ward_daniel"], emotional_engine: { core_wound: "在现实里长期感到自己只能被姐姐拯救、不能成为有用的人", unmet_need: "让姐姐把他的选择当成成年人的选择", defense: "用音乐、玩笑和怀旧绕开正面冲突", false_belief: "只有姐姐留下，才算真正理解他", secret_desire: "在不被带走的前提下重新拥有姐姐", relational_trigger: "艾琳把他称作受害者或病人", transformation: "接受爱可以存在于两个世界，而不是要求姐姐证明忠诚" }, arc: "从向姐姐留下线索到直面两人选择不同世界", secret: "他主动留在Lotus，并非被囚禁" },
      ],
      chapter_arcs: clone(chapterArcs),
      player_contract: clone(playerContract),
      opening: {
        trigger: source.opening.trigger,
        activity: source.opening.activity,
        shock: source.opening.shock,
        consequence: source.opening.consequence,
        locked_events: clone(lockedEvents),
      },
      fact_catalog: clone(facts),
      relationship_rules: clone(relationships),
      reveal_gates: clone(revealGates),
      segment_plan: clone(segmentPlan),
      constraints: [
        "玩家始终是独立参与者，不替代任何NPC功能，也不被预设身份、立场、情绪或行动。",
        "锁定开场逐字播放且不重复生成；第一轮互动发生在Vlog播放结束以后。",
        "揭示门槛满足前只用别名；known_by只代表私下知情，不等于可以公开。",
        "每句NPC对白都必须同时符合四项：人物身份与职业能力、该角色当前知识、此刻关系立场、没有说出口的目标。聪明角色可以隐瞒、转移或试探，但不得为了防剧透突然变笨、忘记自己知道的事实，或询问自己早已知道的基础信息。",
        "隐藏秘密时优先让角色测量别人知道多少、提出有限授权、转移行动方向或只给出部分真话；不能靠荒谬判断、伪专业黑话、空洞威胁或凭空发明权力遮掩。哈罗德第一章的表层理由必须具体落在原始证据、来源范围、同行人员、现场安全和汇报节点上。",
        "制度权限、技术能力、强制措施与倒计时必须由正史事实或当前段素材明确支持；角色不能为制造压力临时发明规定、断网、封锁、撤职或万能设备。",
        "案件推进必须同时回答人的问题与证据的问题：失踪者是谁、为何前往、关系怎样，再核查时间线、朋友家人、交通、监控、文件和现场。",
        "每段默认先完成两个关系或社交节拍，再按因果顺序使用本段素材；不得只因轮数达到阈值就跳过必要事件。",
        "每轮4至7条事件，至少两名在场NPC以台词、动作、停顿或互相承接参与，至少一人开口；同一NPC可以连续说话，不强迫轮流点名。",
      ],
      endgame: {
        type: "bounded_choice",
        payoff: "入口保留每天凌晨三点的十一分钟，但不再吞掉没有选择现实的人。",
        requirements: ["city_overlap_witnessed", "all_positions_articulated", "voluntary_bounded_door_chosen", "reality_preserved"],
      },
    },
  };

  const segments: RuntimeSegment[] = [
    {
      id: "ch01_s01",
      chapter_id: "ch01",
      location: "纽约第七分局档案室",
      scene: "Vlog刚播完，哈罗德先保全原片、确认传播范围，再把今晚能做的事收窄为查玛雅本人；他公开理由是避免污染证据和让人贸然追进未知现场，私下则在争取度过凌晨三点的危险窗口。艾琳看得出他不是没看懂，只是不肯说完。",
      open_questions: [
        "玛雅为何前往Lotus必须通过她的室友、公开账号和匿名私信核实，不能替她编造动机。",
        "Lotus的地址、入口、白发老人和任何异常机制在本段都尚未出现。",
        "艾琳的私人旧伤在本段只作为她不肯拖延失踪案的行为压力，不公开说明具体人物关系。",
        "哈罗德私下知道Lotus有危险，却不能公开表现为知道地址、窗口机制或白发男人。他不能装作看不懂Vlog；提问只能用于确认文件来源、知情范围、证据强度和艾琳准备做什么。",
      ],
      present: ["erin", "harold", "miller"],
      scene_boundary: {
        entry: "锁定开场open_01至open_08已完整播放，三人仍在档案室。",
        allowed_scope: ["回应玩家对Vlog的第一判断", "由哈罗德确认谁持有原片、安排只读复制并限定先做桌面核查", "从报案记录、公开账号或室友信息确认玛雅的生活与家人", "核实匿名私信和玛雅为何把Vlog寄给艾琳", "让哈罗德、艾琳、米勒围绕今晚查到哪一步产生具体分歧"],
        exit_conditions: ["maya_person_and_motive_understood"],
        forbidden_transitions: ["公布Lotus的具体地址", "离开警局前往Lotus", "出现白发老人", "公开尚未进入本章的人物关系", "解释任何超自然真相", "让哈罗德断言Vlog只是恶搞或表现为不懂基本证据", "让哈罗德凭空发明撤职、断网、隔离、封锁或强制规定", "公开哈罗德知道Lotus或正在拖延时间"],
      },
      dramatic: {
        emotional_objective: "先让玛雅成为一个有日常、有家人、会给自己留后路的人，再让三人决定是否认真对待她的求助。",
        pressure: "时钟正在逼近三点。哈罗德的每一步既能保护原始证据，也确实会拖慢到场时间；艾琳必须在不把证据毁掉的前提下逼他继续。",
        turn: "争执不再是‘谁看得懂视频’，而是谁有权决定今晚查到哪一步；随后转为追问玛雅为什么冒险、为什么选中艾琳。",
      },
      arc_contract: segmentArc(chapterArcs[0], ["rel_erin_harold", "rel_erin_miller"], "是否把玛雅当成一个具体的人认真寻找，会检验哈罗德的风险控制究竟是在保护谁，也检验艾琳能否在着急时仍尊重证据。", "两个选项都只回应已经公开的玛雅信息：一条靠近人物与关系，一条要求继续核实；不得抢先给出地址或陌生人物。", {
        起: "承接玩家第一句话；哈罗德先问传播范围和原件状态，艾琳逼他说明今晚到底允许查什么。",
        承: "哈罗德给出可执行的桌面核查，艾琳与米勒分别从失踪者时间和人的生活反推这份限制是否足够。",
        转: "用报案记录与公开账号确认玛雅不是会随意断联的人。",
        合: "由室友保存的匿名私信说明她为何去Lotus、为何留下Vlog；哈罗德不再否认核查必要，只把下一步限制为可复核的路线调查。",
      }),
      tempo_budget: tempo(["回应玩家的判断与身份，并让哈罗德用一个专业问题判断玩家掌握多少", "让玛雅从屏幕里的失踪者变成具体的人"]),
      materials: [
        { id: "m_ch01_s01_maya_profile", detail: "从报案记录和公开账号确认：玛雅二十四岁，以拍城市夜生活为生，但平时会向父亲和室友报平安；母亲两年前病逝。", consequence: "房间里的争论第一次不再只围绕一段怪视频，而是围绕一个有家可回的人。", emotional_consequence: "艾琳对‘又一个失踪者’的职业执念变成对玛雅具体生活的保护欲。", relationship_effect: "哈罗德接受新事实并调整分工，却仍把行动留在警局内；这显示他在控制风险而非轻视玛雅，也让艾琳更怀疑他究竟在防什么。", fact_ids: ["fact_maya_profile"] },
        { id: "m_ch01_s01_maya_motive", detail: "室友保存了玛雅提过的匿名私信：Lotus 99据说能让人再见到失去的人。玛雅没有把行程告诉父亲，却把原始Vlog寄给了长期追查失踪案、不会把求助推到明天的艾琳。", consequence: "玛雅的冒险有了人的理由，也说明她在进入危险前主动给自己留下了被找到的可能。", emotional_consequence: "艾琳接下的不只是一个文件，而是玛雅明确交到她手里的信任。", relationship_effect: "哈罗德失去‘来源不明所以暂停’这层理由，转而批准继续核对现实路线；他让步得准确而有限，艾琳因此既得到下一步，也没有真正信任他。", fact_ids: ["fact_maya_motive", "fact_maya_vlog"] },
      ],
      allowed_fact_ids: ["fact_maya_missing", "fact_maya_vlog", "fact_maya_profile", "fact_maya_motive"],
      allowed_material_ids: ["m_ch01_s01_maya_profile", "m_ch01_s01_maya_motive"],
      forbidden_reveal_ids: ["reveal_ward_identity", "reveal_lotus_mechanism", "reveal_daniel_is_zero", "reveal_daniel_choice", "reveal_harold_complicity"],
      progression: "先由哈罗德完成原件、来源和知情范围的风险检查，再调查玛雅的日常与匿名私信；本段只解决‘她是谁、为何求助’，哈罗德可批准继续核对路线，但不寻找地址、不出现外部嫌疑人。",
      exit: ["maya_person_and_motive_understood"],
      next: "ch01_s02",
      join: "玩家可自定义职业与性格后作为艾琳邀请留下的独立参与者加入；NPC应据此调整称呼、信任和专业期待，但不能替玩家补写经历。",
    },
    {
      id: "ch01_s02",
      chapter_id: "ch01",
      location: "纽约第七分局档案室",
      scene: "三人继续留在档案室，把玛雅的交通记录、最后一通电话、沿街公共监控和夜间帖子拼成一条去Red Hook的路线。哈罗德不装作第一次听见Lotus；他只追问每一段路线能否由第二个来源印证，并准备把必然发生的外出压成一次同行、报位置、不强行进入的失踪者核查。",
      open_questions: [
        "本段只定位地址和可观察的夜间规律，不能声称已经看见真正入口。",
        "白发老人尚未进入剧情，周边商铺监控也尚未调取。",
        "不得公开尚未进入本章的人物、白发老人的姓名、异常机制或哈罗德的隐藏知情。",
        "哈罗德私下认识Lotus和白发男人，因此不能用‘这地方根本不存在’或基础常识错误来拖延；他必须检查证据链、行动人数、汇报节点和是否强行进入。",
      ],
      present: ["erin", "harold", "miller"],
      scene_boundary: {
        entry: "三人已经确认玛雅主动留下求助，现在开始寻找她最后到过的现实地址。",
        allowed_scope: ["核对交通记录与室友最后通话中的轮渡汽笛", "沿街公共监控确认玛雅进入第99号仓库背街", "从登记资料与公开夜间帖子确认旧修车铺和02:49后的异常人流", "让哈罗德用第二来源测试路线证据而不是假装不知道地点", "由哈罗德给出同行、报位置、不强行进入的有限核查边界", "决定亲自去地址核查"],
        exit_conditions: ["lotus_address_located", "field_check_committed"],
        forbidden_transitions: ["已经抵达第99号仓库", "出现白发老人", "说出白发老人的姓名", "公开尚未进入本章的人物关系", "解释超自然入口", "让哈罗德说出他早已知道地址、白发男人或危险窗口", "公开哈罗德私下联络的对象或内容", "让哈罗德用断网、撤职或虚构规定代替具体行动边界"],
      },
      dramatic: {
        emotional_objective: "让三人沿着玛雅主动留下的现实痕迹找到一个可以亲自核查的地址。",
        pressure: "地址一旦被确认，彻底禁止外出只会逼艾琳绕开指挥；哈罗德必须在暴露自己与失去控制之间选择一条更窄的路。",
        turn: "模糊的俱乐部名字变成Red Hook第99号仓库和一段只在深夜成立的营业规律；哈罗德由阻止外出转为批准一次范围明确的核查，并留在警局执行没有说明的后手。",
      },
      arc_contract: segmentArc(chapterArcs[0], ["rel_erin_harold", "rel_erin_miller", "rel_miller_harold"], "找到地址意味着三人必须决定如何承担今夜外出核查的责任，也让哈罗德每一道合理限制都显出他没有说完的另一层目的。", "一个选项继续核对路线，一个选项迫使哈罗德明确行动边界；不得提前写到现场或监控老人。", {
        起: "按玩家身份分配一项可执行的路线核查；哈罗德只问证据如何互相印证。",
        承: "用室友最后通话和三人的分工增加时间压力；米勒可拆穿哈罗德不是反对调查，而是在卡到场方式和时间。",
        转: "让交通记录、轮渡汽笛与沿街监控互相印证Red Hook路线。",
        合: "确认第99号仓库的登记与02:49后的夜间规律；哈罗德批准艾琳、米勒与玩家同行核查，要求到场报位置且不强行进入，自己留下并收起一份地址。",
      }),
      tempo_budget: tempo(["按玩家身份分配一项实际核查，让哈罗德检验方法而不是否定结论", "让玛雅最后一通电话留下情感余波，并让米勒察觉哈罗德的限制过分精确"]),
      materials: [
        { id: "m_ch01_s02_route", detail: "交通记录、室友通话里的轮渡汽笛和沿街公共监控互相印证：玛雅进入Red Hook第99号仓库背街后，没有从街口出来。", consequence: "他们得到可执行的搜寻范围，也意识到玛雅最后仍在努力给外界留下路线。", emotional_consequence: "玛雅不再像冲动闯入，她像是预感到危险仍努力给某个人留下回来的路。", relationship_effect: "哈罗德逐项复核而不再争论是否调查，显出他的反对针对到场风险而非玛雅本人；艾琳因此更难把他简单归为冷漠。", fact_ids: ["fact_maya_route"] },
        { id: "m_ch01_s02_schedule", detail: "地址白天登记为旧修车铺；近一个月的夜间帖子显示，同一地点只有凌晨02:49以后才出现俱乐部灯光和人流。哈罗德批准一次同行核查，要求到场报位置、不强行进入；众人离开时，他留下了一份手写地址，但没有解释用途。", consequence: "众人知道该去哪里、何时去，也取得范围受控的现场核查理由；哈罗德保住指挥链，同时得到独自处理后手的空间。", emotional_consequence: "等待不再是程序选择，而是可能错过玛雅的道德压力；哈罗德的有限让步则让人看见他既担心艾琳，也在保护别的东西。", relationship_effect: "艾琳得到行动却没有得到真话，米勒必须一边遵守安全边界、一边替她留意哈罗德没说出口的安排。", fact_ids: ["fact_lotus_surface_schedule"] },
      ],
      allowed_fact_ids: ["fact_maya_missing", "fact_maya_vlog", "fact_maya_profile", "fact_maya_motive", "fact_maya_route", "fact_lotus_surface_schedule"],
      allowed_material_ids: ["m_ch01_s02_route", "m_ch01_s02_schedule"],
      forbidden_reveal_ids: ["reveal_ward_identity", "reveal_lotus_mechanism", "reveal_daniel_is_zero", "reveal_daniel_choice", "reveal_harold_complicity"],
      progression: "先拼出玛雅的交通路线，再核对地址登记和夜间帖子；哈罗德必须以专业复核和有限授权回应，不得靠装傻或虚构权力阻止。本段以调查组按边界前往第99号仓库、哈罗德留在警局处理未知后手收束，不越过到场过程。",
      exit: ["lotus_address_located", "field_check_committed"],
      next: "ch01_s03",
      join: "玩家继续按自定义身份参与核查：专业身份可以提出相应方法，非专业身份也能从人物、常识和选择上施加影响。",
    },
    {
      id: "ch01_s03",
      chapter_id: "ch01",
      location: "Red Hook第99号仓库外",
      scene: "艾琳、米勒和玩家赶到玛雅路线终点。门牌、墙面和Vlog角度都能对上，眼前却只有一间落锁的旧修车铺，没有俱乐部招牌、排队人群或那扇铁门。",
      open_questions: [
        "这里只能确认现实现场没有Vlog里的入口，不能据此解释入口去了哪里。",
        "身份不明的白发老人尚未出现在本段；必须先决定从周边普通监控继续查。",
        "不得公开白发老人的姓名、后续人物关系、异常机制或哈罗德隐瞒真相。",
        "哈罗德留在警局且不在本段发言；他此前给出的不强行进入、到场报位置等边界可以影响艾琳与米勒的选择，但不能凭空变成远程命令或新规定。",
      ],
      present: ["erin", "miller"],
      scene_boundary: {
        entry: "三人依据已经确认的地址抵达第99号仓库，第一次离开警局实地核查。",
        allowed_scope: ["比对门牌、墙面、排水管与Vlog拍摄角度", "检查落锁旧修车铺和后巷的普通物理痕迹", "确认现场没有俱乐部入口与人流", "寻找能覆盖后巷的附近商铺摄像头"],
        exit_conditions: ["lotus_site_reached", "lotus_entry_absent", "nearby_camera_search_chosen"],
        forbidden_transitions: ["真正入口突然出现", "白发老人已经在现场", "说出白发老人的姓名", "公开尚未进入本章的人物关系", "解释入口为何消失"],
      },
      dramatic: {
        emotional_objective: "让一次看似顺利的地址核查落空，使玛雅留下的路线更可信、现场本身却更难解释。",
        pressure: "如果这里什么都没有，艾琳需要说服米勒继续查周边痕迹，同时决定哈罗德的‘不强行进入’究竟保护了他们，还是正好让某个人得到清场时间。",
        turn: "地址被证明正确，但本应存在的入口不存在；调查对象从一栋楼转向谁曾在这里活动。",
      },
      arc_contract: segmentArc(chapterArcs[0], ["rel_erin_miller"], "扑空会检验艾琳和米勒是相信玛雅留下的路线，还是相信眼前这堵普通的墙。", "两个选项要在‘继续细查现场’与‘转查周边见证’之间形成相反做法，不能让入口或嫌疑人凭空出现。", {
        起: "抵达后先按现实顺序核对门牌与Vlog角度。",
        承: "让艾琳和米勒对‘什么都没有’产生不同判断。",
        转: "确认眼前只是落锁旧修车铺，周围没有俱乐部营业痕迹。",
        合: "确认Vlog中的铁门位置现在是一段没有门缝的墙，决定调取附近普通商铺监控。",
      }),
      tempo_budget: tempo(["按玩家身份分配一项现场比对", "让艾琳与米勒对扑空作出不同反应"]),
      materials: [
        { id: "m_ch01_s03_arrival", detail: "门牌、墙面污迹、排水管和Vlog的拍摄角度都能对上：这里就是Red Hook第99号仓库；现场却只有落锁的旧修车铺，没有招牌、灯光或排队人群。", consequence: "地址没有错，但他们找不到Vlog里那家正在营业的俱乐部。", emotional_consequence: "艾琳得到的不是答案，而是玛雅没有走错地方的证明。", relationship_effect: "米勒可以质疑视频，也必须承认艾琳坚持赶来并非毫无根据。", fact_ids: ["fact_lotus_surface_schedule"] },
        { id: "m_ch01_s03_no_entry", detail: "Vlog里铁门所在的位置现在是一段连续砖墙，附近没有门缝、机关或新封砌痕迹；能继续核查的只剩对着后巷的商铺摄像头。", consequence: "众人确认现场没有真正入口，下一步只能寻找曾在这里出现的人。", emotional_consequence: "玛雅留下的画面越真实，眼前的空无就越让人不安。", relationship_effect: "艾琳和米勒暂时放下对视频真假的争执，转而共同寻找现实见证；哈罗德先查证后到场的顺序在结果上保护了他们，却也显得像是精确知道这里何时会什么都没有。", fact_ids: ["fact_lotus_no_entry"] },
      ],
      allowed_fact_ids: ["fact_maya_missing", "fact_maya_vlog", "fact_maya_profile", "fact_maya_motive", "fact_maya_route", "fact_lotus_surface_schedule", "fact_lotus_no_entry"],
      allowed_material_ids: ["m_ch01_s03_arrival", "m_ch01_s03_no_entry"],
      forbidden_reveal_ids: ["reveal_ward_identity", "reveal_lotus_mechanism", "reveal_daniel_is_zero", "reveal_daniel_choice", "reveal_harold_complicity"],
      progression: "先验证地址没有错，再确认入口确实不在现场；本段只把调查自然转向周边监控，不出现白发老人本人。",
      exit: ["lotus_site_reached", "lotus_entry_absent", "nearby_camera_search_chosen"],
      next: "ch01_s04",
      join: "玩家与艾琳、米勒一同到场，可从视觉比对、常识判断或询问周边商户的方式推动核查。",
    },
    {
      id: "ch01_s04",
      chapter_id: "ch01",
      location: "Red Hook第99号仓库附近街口",
      scene: "三人找到一间仍亮着灯的临街商铺，请店员调出覆盖后巷的普通监控；画面将把调查从消失的入口转向一个身份不明的白发老人。",
      open_questions: [
        "白发老人的姓名、身份、动机以及他与Lotus的关系都未知，只能按外貌与出入路线描述。",
        "黑色机甲只能作为画面中的受损机械物出现，不能解释功能或来源。",
        "不得公开白发老人的姓名与功能、后续人物关系、异常机制或哈罗德知情真相。",
        "哈罗德仍不在场，不能借电话、短信或旁白说出他认识画面中的人；是否把截帧立即发给他可以成为艾琳与米勒的信任分歧，但不能改变既定线索。",
      ],
      present: ["erin", "miller"],
      scene_boundary: {
        entry: "现场没有入口，三人转向调取覆盖第99号仓库后巷的附近商铺监控。",
        allowed_scope: ["请附近商铺提供覆盖后巷的监控片段", "按时间码对照玛雅Vlog", "看见身份不明的白发老人修理黑色机甲", "从多日片段确认老人往返旧码头维修棚", "决定下一步先找到并询问老人"],
        exit_conditions: ["unknown_mechanic_seen_on_monitor", "unknown_mechanic_trace_confirmed", "search_unknown_mechanic_committed"],
        forbidden_transitions: ["白发老人已经来到现场", "说出白发老人的姓名", "确认老人的隐藏功能", "公开尚未进入本章的人物关系", "解释超自然入口真相"],
      },
      dramatic: {
        emotional_objective: "给扑空的调查一个具体的人形目标，却保留他究竟是证人、修理工还是嫌疑人的不确定。",
        pressure: "一旦决定找老人，艾琳和米勒就要承担把一段怪视频变成实际追查的后果，也要决定是先把这张脸交回哈罗德，还是先保留一步自己的判断。",
        turn: "监控先证明后巷确实有人活动，再用老人反复往返维修棚的路线形成下一章行动理由。",
      },
      arc_contract: segmentArc(chapterArcs[0], ["rel_erin_miller"], "找到一个现实中的人，意味着两人终于无法再把玛雅的经历全归给视频故障。", "两个选项分别倾向把老人当证人或当需要谨慎接近的嫌疑人；都只能决定如何找他，不能替他自报身份。", {
        起: "先取得一段合法、普通、能覆盖后巷的商铺监控。",
        承: "对照Vlog时间码，让艾琳与米勒分别提出可验证的观察。",
        转: "监控拍到白发老人曾在雨中修理受损黑色机甲。",
        合: "多日片段确认他往返旧码头维修棚；艾琳和米勒决定先找到这个身份不明的人。",
      }),
      tempo_budget: tempo(["让玩家决定先核对哪段时间", "让艾琳与米勒对老人是证人还是嫌疑人产生分歧"]),
      materials: [
        { id: "m_ch01_s04_camera_access", detail: "街口商铺同意提供后巷监控。录像时间连续，摄像头能拍到第99号仓库侧门与玛雅Vlog中的那段墙，但没有拍到俱乐部入口出现。", consequence: "他们获得一份独立于玛雅设备的现实记录。", emotional_consequence: "一段普通监控让继续调查第一次不必只依赖那支异常Vlog。", relationship_effect: "米勒愿意继续看，艾琳也必须接受画面可能推翻自己的预期。" },
        { id: "m_ch01_s04_monitor", detail: "监控拍到一名身份不明的白发老人曾在暴雨中修理黑色机甲；翻看其他日期后，他们确认老人多次带着工具往返旧码头维修棚，而且维修棚一直开到凌晨三点。画面没有姓名，艾琳和米勒决定先找到他。", consequence: "第一章以一张可追查的脸、一条现实路线和一个营业时间结束，而不是以未经解释的真相结束。", emotional_consequence: "玛雅留下的求助终于指向一个可能回答问题的活人。", relationship_effect: "艾琳与米勒形成暂时共同战线，但会在‘先向哈罗德汇报’与‘先接触老人再汇报’之间产生合理分歧；无论选择哪边，都不得说明哈罗德认识老人。", fact_ids: ["fact_unknown_mechanic_trace"] },
      ],
      allowed_fact_ids: ["fact_maya_missing", "fact_maya_vlog", "fact_maya_profile", "fact_maya_motive", "fact_maya_route", "fact_lotus_surface_schedule", "fact_lotus_no_entry", "fact_unknown_mechanic_trace"],
      allowed_material_ids: ["m_ch01_s04_camera_access", "m_ch01_s04_monitor"],
      forbidden_reveal_ids: ["reveal_ward_identity", "reveal_lotus_mechanism", "reveal_daniel_is_zero", "reveal_daniel_choice", "reveal_harold_complicity"],
      progression: "先取得普通商铺监控，再由连续画面锁定身份不明的白发老人及其维修棚路线；以决定找老人结束第一章。",
      exit: ["unknown_mechanic_seen_on_monitor", "unknown_mechanic_trace_confirmed", "search_unknown_mechanic_committed"],
      next: "ch02_s01",
      join: "玩家可参与选择监控时段、判断画面意义，并决定下一章更适合把老人当证人还是嫌疑人接近。",
    },
    {
      id: "ch02_s01",
      chapter_id: "ch02",
      location: "Red Hook旧码头维修棚",
      scene: "艾琳、米勒和玩家已经在旧码头维修棚找到监控里的白发老人，交涉刚刚开始。老人仍在修理那具黑色机甲；众人拿出监控，先问他是否见过玛雅，再问画面里打开的门通向哪里。",
      present: ["erin", "miller", "ward"],
      scene_boundary: {
        entry: "一行人已经凭监控中的外貌和黑色机甲找到白发修理工，并从第一章结尾的初次接触继续交涉；他们仍不知道他的姓名与真实身份。",
        allowed_scope: ["出示维修棚监控并追问门为何打开", "询问白发修理工是否见过玛雅", "观察维修棚与第99号仓库的表层联系", "让白发修理工在充分交涉后合理拒绝放行", "决定是否从侧门强行进入"],
        exit_conditions: ["unknown_mechanic_refuses_entry", "forced_entry_committed"],
        forbidden_transitions: ["直接进入真正营业的Lotus 99", "揭开匿名DJ身份", "解释Lotus的完整梦境机制"],
      },
      dramatic: {
        emotional_objective: "让众人发现老人不是容易吓住的证人，也不是能凭外貌定罪的嫌疑人。",
        pressure: "玛雅可能仍在里面，白发修理工却用平静而具体的理由挡门。",
        turn: "正常询问失败后，艾琳必须决定是否越过程序与门槛。",
      },
      arc_contract: segmentArc(chapterArcs[1], ["rel_erin_miller", "rel_harold_ward"], "若沃德既温和又危险，众人就不能靠简单定罪逃过选择。", "一个选项接近沃德作为普通人的一面，一个选项试探门与规则；两者都只能推进门外谈判。", {
        起: "先让沃德以正在修东西的普通老人进入群戏。",
        承: "让艾琳的戒备、米勒的街头直觉与沃德的温和互相试探。",
        转: "白发修理工明确拒绝进入，也不交代姓名。",
        合: "艾琳决定从侧门强行进入他指向的通道。",
      }),
      tempo_budget: tempo(["回应修理工的日常态度", "试探他是否认得监控画面", "让艾琳与米勒对进入方式产生分歧"]),
      materials: [
        { id: "m_ch02_s01_refusal", detail: "白发修理工挡在卷帘门前，拒绝众人进入，也拒绝说明姓名；他只说这里是维修棚，玛雅不在里面。", consequence: "礼貌询问与警察身份都没换来通行，老人仍只能以监控里的白发修理工称呼。" },
        { id: "m_ch02_s01_force", detail: "艾琳不接受拒绝；众人决定绕到维修棚侧门，强行进入修理工指向的通道。", consequence: "调查组主动越过了老人划出的边界，也必须承担闯入后可能一无所获的代价。" },
      ],
      allowed_fact_ids: ["fact_maya_missing", "fact_maya_vlog", "fact_unknown_mechanic_trace"],
      allowed_material_ids: ["m_ch02_s01_refusal", "m_ch02_s01_force"],
      forbidden_reveal_ids: ["reveal_ward_identity", "reveal_lotus_mechanism", "reveal_daniel_is_zero", "reveal_daniel_choice", "reveal_harold_complicity"],
      progression: "先让询问和试探真实失败，再让白发修理工明确拒绝，最后由调查组作出强行进入的选择。",
      exit: ["unknown_mechanic_refuses_entry", "forced_entry_committed"],
      next: "ch02_s02",
      join: "玩家与艾琳、米勒同行到维修棚，可选择继续交涉、观察出入口，或支持/反对强行进入。",
    },
    {
      id: "ch02_s02",
      chapter_id: "ch02",
      location: "Lotus 99空置外场",
      scene: "众人从维修棚侧门强行进入，却只找到一处落灰的空置外场：没有玛雅、客人、音乐，也没有Vlog里真正的舞池。",
      present: ["erin", "miller", "ward"],
      scene_boundary: {
        entry: "众人已经越过白发修理工的拒绝，从侧门进入他指向的空间。",
        allowed_scope: ["搜查吧台、空舞池和后台", "核对灰尘、断电设备与出入痕迹", "质问白发修理工为何把他们引到这里", "确认这不是Vlog中的真正俱乐部"],
        exit_conditions: ["false_lotus_entry_searched", "false_lotus_entry_confirmed_empty"],
        forbidden_transitions: ["匿名DJ摘下面罩", "说明另一座纽约是集体梦境", "公开哈罗德长期默许Lotus", "让哈罗德假装不知道这里或沃德是谁", "让哈罗德凭空以撤职、逮捕或虚构条例恐吓调查组", "让哈罗德说出与沃德的既有关系"],
      },
      dramatic: {
        emotional_objective: "让艾琳为强行进入付出一次看得见的挫败，也让米勒敢于质疑她的判断。",
        pressure: "他们越搜越像闯进一个废弃布景；承认被耍意味着线索中断，不承认则会继续浪费时间。",
        turn: "一次看似果断的突破，变成白发修理工精心准备的错误入口。",
      },
      arc_contract: segmentArc(chapterArcs[1], ["rel_erin_miller"], "被老人摆了一道会逼艾琳承认急迫也可能制造盲点。", "一个选项继续系统搜查，一个选项转而拆穿老人给出的假入口；两者都不能凭空找到玛雅。", {
        起: "先让空置外场像一个可能藏过人的现实空间。",
        承: "艾琳与米勒分别核对痕迹，允许他们对强行进入是否值得发生冲突。",
        转: "搜查结果逐项排除玛雅、客流和真正舞池存在。",
        合: "确认老人故意给了错误入口，调查组转而寻找他没想让人听见的东西。",
      }),
      tempo_budget: tempo(["让玩家选择先查哪一处", "让艾琳与米勒处理强行进入后的尴尬"]),
      materials: [
        { id: "m_ch02_s02_search", detail: "众人搜过吧台、空舞池和后台：设备断电，灰尘完整，没有玛雅或近期客流留下的痕迹。", consequence: "强行进入没有带来突破，只把一次错误判断摆到众人面前。" },
        { id: "m_ch02_s02_empty", detail: "现场与Vlog中的空间尺寸、出入口和设备位置都对不上；众人确认白发修理工故意把他们引进一处空壳。", consequence: "老人从拒绝合作的证人变成会主动误导调查的对手。", fact_ids: ["fact_false_lotus_entry"] },
      ],
      allowed_fact_ids: ["fact_maya_missing", "fact_maya_vlog", "fact_unknown_mechanic_trace", "fact_false_lotus_entry"],
      allowed_material_ids: ["m_ch02_s02_search", "m_ch02_s02_empty"],
      forbidden_reveal_ids: ["reveal_ward_identity", "reveal_lotus_mechanism", "reveal_daniel_is_zero", "reveal_daniel_choice", "reveal_harold_complicity"],
      progression: "先按真实搜查程序排除可能性，再确认这个空间就是白发修理工准备的错误入口。",
      exit: ["false_lotus_entry_searched", "false_lotus_entry_confirmed_empty"],
      next: "ch02_s03",
      join: "玩家参与搜查与判断，可继续追空间痕迹，也可质疑老人为何愿意让他们闯进空壳。",
    },
    {
      id: "ch02_s03",
      chapter_id: "ch02",
      location: "Lotus 99空置外场及DJ通道",
      scene: "众人在空壳里拆查一块松动隔板。螺丝刚退出半寸，隔板后的壁挂旧音响传出电流爆音，随后断断续续滑出一段带留声机杂音的乡村吉他旋律；艾琳认出那是丹尼尔八岁时在吉他上创作的曲子。",
      present: ["erin", "miller"],
      scene_boundary: {
        entry: "错误入口已经被搜空，白发修理工仍未公开姓名；零点只能作为远处的匿名DJ出现。",
        allowed_scope: ["让螺丝与隔板后的电流爆音按顺序出现", "让断电旧音响断续播放带留声机杂音的童年吉他旋律", "让艾琳明确说出那是丹尼尔八岁时创作且只有姐弟知道的曲子", "让通道尽头出现疑似丹尼尔的面罩身影但不确认身份", "让米勒用符合当轮语境的不客气口吻叫停行动并提出Cosplay乔装；衣服可以是他提前准备，也可以临时找朋友借"],
        exit_conditions: ["childhood_song_recognized", "erin_loses_control", "suspected_zero_seen", "cosplay_return_plan_adopted"],
        forbidden_transitions: ["零点摘下面罩", "直接确认零点就是丹尼尔", "解释Lotus梦境机制", "公开白发修理工姓名"],
      },
      dramatic: {
        emotional_objective: "第一次让艾琳的姐姐身份压过警探身份，并让旁人看见她真正害怕失去谁。",
        pressure: "歌曲是极私人的证据，却不足以在程序上证明任何事；追上去又可能再次落入诱导。",
        turn: "空无一物的假入口突然发出只属于姐弟的声音；艾琳追向疑似弟弟的人影，米勒第一次强行替她按下暂停。",
      },
      arc_contract: segmentArc(chapterArcs[1], ["rel_erin_miller", "rel_erin_daniel"], "艾琳确信弟弟在这里，米勒却必须在保护搭档与维持判断之间做选择。", "一个选项顺着歌曲追零点，一个选项先稳住艾琳并记录通道；两种相反方法都导向下一次潜伏。", {
        起: "先让空置外场恢复寂静，给错误判断留下余味。",
        承: "歌曲出现后不立刻解释，让艾琳先从细节认出它。",
        转: "艾琳情绪失控地追向疑似弟弟的面罩身影，对方却从通道消失。",
        合: "米勒判断这是圈套，宣布今晚到此为止，并提出弄到Cosplay服装后换装再来；衣服来源与具体说法由当轮互动自然决定。",
      }),
      tempo_budget: tempo(["让艾琳解释这首歌为何不可能是巧合", "让米勒决定此刻是拦她还是跟上去"]),
      materials: [
        { id: "m_ch02_s03_song", detail: "一枚螺丝被拧出半寸，隔板后先传出极轻的电流爆音；早已断电的壁挂旧音响随后断断续续播放一段粗糙、带留声机杂音的乡村吉他旋律。艾琳的手电光猛地晃开，她僵在原地，失声说：‘那是丹尼尔八岁时在吉他上创作的，除了我和他没人知道。’", consequence: "音乐必须在描写旧音响响起且艾琳明确听见之后才触发；随后由艾琳说出这段只属于姐弟的来源，她的职业克制开始断裂。", emotional_consequence: "希望、愤怒和三年来不敢确认的期待同时击中艾琳。", fact_ids: ["fact_erin_daniel_siblings", "fact_zero_childhood_song"] },
        { id: "m_ch02_s03_evasion", detail: "艾琳追向DJ通道，在尽头看见一个身形与丹尼尔相似的面罩男人；她失控地叫出弟弟的名字，对方停了半秒，却在她靠近前从侧门消失。", consequence: "艾琳认定弟弟就在这里，但尚未得到身份确认。", relationship_effect: "米勒相信她听见的私人线索，却不能放任她继续追进第二个陷阱。" },
        { id: "m_ch02_s03_disguise_plan", detail: "米勒挡住还要追的艾琳，判断眼前是故意引他们追进去的圈套，明确宣布今晚到此为止，并提出弄一批Cosplay服装后换装混进内场。服装可以是他提前准备好的，也可以临时找熟悉二次元的朋友借；具体来源、脏话轻重与台词由当轮关系和语气自然决定，不必固定复述。", consequence: "第二章以一项带点丢脸、但比再次强闯聪明的乔装计划结束。", emotional_consequence: "米勒用明确的叫停替艾琳争取喘息，也公开承担下一次陪她进去的风险。" },
      ],
      allowed_fact_ids: ["fact_maya_missing", "fact_maya_vlog", "fact_false_lotus_entry", "fact_erin_daniel_siblings", "fact_zero_childhood_song"],
      allowed_material_ids: ["m_ch02_s03_song", "m_ch02_s03_evasion", "m_ch02_s03_disguise_plan"],
      forbidden_reveal_ids: ["reveal_ward_identity", "reveal_lotus_mechanism", "reveal_daniel_is_zero", "reveal_daniel_choice", "reveal_harold_complicity"],
      progression: "先以歌曲制造私人证据，再让零点用躲避而非说明留下悬念；以改变调查方法结束第二章。",
      exit: ["childhood_song_recognized", "erin_loses_control", "suspected_zero_seen", "cosplay_return_plan_adopted"],
      next: "ch03_s01",
      join: "玩家可以接住艾琳的失控、提醒米勒记录证据，或提出潜伏进入的办法，但不能提前断言零点身份。",
    },
    {
      id: "ch03_s01",
      chapter_id: "ch03",
      location: "Red Hook后巷及Lotus 99舞池",
      scene: "众人已经在多比与银河护卫队两套Cosplay方案中选定一套，并顺利混入真正营业的Lotus 99。服装首先带来一场互相拆台；随后他们发现，这里的怪异造型并不都能用Cosplay解释。",
      present: ["erin", "miller"],
      scene_boundary: {
        entry: "正面闯入已被证实是错误方法；章节过渡卡已经记录众人选择的服装，必须承接该装扮展开不同的开场调侃。",
        allowed_scope: ["承接已选择的Cosplay装扮互相调侃", "让两套服装都能顺利入场", "展示真正舞池与空壳的空间反差", "让怪异造型逐步显出真实情感而非单纯猎奇", "确认老人第一次故意引错"],
        exit_conditions: ["true_lotus_infiltrated", "false_entry_deception_confirmed"],
        forbidden_transitions: ["匿名DJ摘下面罩", "沃德完整解释集体梦境", "丹尼尔说明主动留下的原因"],
      },
      dramatic: {
        emotional_objective: "让艾琳把找弟弟的急切重新压回专业判断，也让她学会依靠米勒和玩家。",
        pressure: "任何过度专业的动作都可能暴露他们；太像来玩的，又会错过玛雅与零点。",
        turn: "调查组从强闯者变成需要彼此配合的潜入者，并确认老人第一次确实骗了他们。",
      },
      arc_contract: segmentArc(chapterArcs[2], ["rel_erin_miller"], "只有艾琳愿意把控制权分给同伴，潜伏才不会再次变成一次冲动闯入。", "一个选项偏向耐心观察，一个选项偏向主动扮演；两者都必须服务潜入而非立即抓人。", {
        起: "先通过观察营业规律找到真正客流。",
        承: "用乔装中的小失误和互相拆台建立群戏，不把潜伏写成万能变装。",
        转: "跟随真实来客通过之前不存在的入口。",
        合: "确认舞池与空壳完全不同，老人第一次故意把他们引错。",
      }),
      tempo_budget: tempo(["分配潜伏时谁负责观察谁负责接近", "让乔装暴露每个人不擅长伪装的地方"]),
      materials: [
        { id: "m_ch03_s01_disguise", detail: "章节过渡卡记录了玩家选择的服装：多比方案围绕湿透的粗布、过大的耳朵和失去警察尊严互损；银河护卫队方案围绕树人外壳、浣熊尾巴与过度显眼的潜伏互损。两套方案都能通过门口。", consequence: "乔装成功，也让三个人在真正危险前先恢复了一点活人之间的松弛。", relationship_effect: "艾琳允许米勒用玩笑替她从上一晚的失控里退半步。" },
        { id: "m_ch03_s01_true_club", detail: "门后是有客流、音乐、玩偶巡逻者和真实DJ台的俱乐部；有人穿回童年卡通外壳，有人把机械义肢改成花枝，有人和已经去世的亲人隔桌说话。这里与先前空置外场的尺寸和布局完全不同。", consequence: "众人确认白发修理工第一次故意把他们引到错误入口，也明白奇观背后是具体的人在逃离具体的失去。", fact_ids: ["fact_true_lotus_entry", "fact_false_lotus_entry"] },
      ],
      allowed_fact_ids: ["fact_maya_missing", "fact_maya_vlog", "fact_false_lotus_entry", "fact_zero_childhood_song", "fact_true_lotus_entry", "fact_erin_daniel_siblings"],
      allowed_material_ids: ["m_ch03_s01_disguise", "m_ch03_s01_true_club"],
      forbidden_reveal_ids: ["reveal_ward_identity", "reveal_lotus_mechanism", "reveal_daniel_is_zero", "reveal_daniel_choice", "reveal_harold_complicity"],
      progression: "先承接服装选择展开不同的群戏，再从好笑的外观逐步看见其中真实的愿望与失去；不提前找到玛雅或解释机制。",
      exit: ["true_lotus_infiltrated", "false_entry_deception_confirmed"],
      next: "ch03_s02",
      join: "玩家已经在过渡卡选择服装；NPC必须记住并调侃该选择，后续选项再决定如何穿过奇观寻找玛雅。",
    },
    {
      id: "ch03_s02",
      chapter_id: "ch03",
      location: "Lotus 99舞池及后台",
      scene: "众人穿过一连串由遗憾和愿望长出的奇怪景象，在后台找到活着的玛雅；她不是等人营救的证物。白发修理工随后出现，这一次无法再用空壳把人打发走。",
      present: ["erin", "miller", "maya", "ward"],
      scene_boundary: {
        entry: "真正俱乐部已经被找到，但玛雅是否自愿、白发修理工是谁、零点身份和入口机制仍未知。",
        allowed_scope: ["用两三个有情感来源的奇观推进寻找而非堆设定", "确认玛雅活着并让她亲自表达状态", "让艾琳先把玛雅当人而不是证物", "再次堵住白发修理工", "让老人亲口说明姓名但暂不解释完整机制"],
        exit_conditions: ["maya_found_alive", "ward_identity_public"],
        forbidden_transitions: ["丹尼尔解释为何主动留下", "哈罗德承认长期默许", "沃德宣布永久开门"],
      },
      dramatic: {
        emotional_objective: "把找到玛雅的胜利变成一次需要倾听她本人、而不是替她定义处境的关系考验。",
        pressure: "艾琳急着问零点，玛雅却需要先确认自己不会被强行带走；白发修理工仍掌握入口主动权。",
        turn: "失踪者不再只是案件目标，白发老人也终于从模糊身影变成可以被追责的人。",
      },
      arc_contract: segmentArc(chapterArcs[2], ["rel_erin_miller"], "玛雅的声音必须改变调查组对‘营救’的理解。", "一个选项先照顾玛雅的安全感，一个选项先控制白发修理工的退路；两者都不能替玛雅下结论。", {
        起: "先在后台辨认玛雅并确认她活着。",
        承: "让玛雅亲口回应艾琳，避免旁白代替她解释全部经历。",
        转: "白发修理工再次出现，众人用第一次假入口的证据堵住他的回避。",
        合: "老人公开自己叫沃德，答应带他们去能说明规则的地方。",
      }),
      tempo_budget: tempo(["让奇观中的某个人触到艾琳或玩家的关系选择", "让玛雅决定先信任谁"]),
      materials: [
        { id: "m_ch03_s02_wonders", detail: "俱乐部的奇观必须从人物情感生长：有人用童年卡通身体拒绝长大，有人让机械义肢开花，有人与逝去亲人共坐，却都在凌晨三点到来时露出害怕醒来的瞬间。", consequence: "Lotus不再只是视觉怪谈，而成为每个人拿愿望抵押现实的地方。", emotional_consequence: "艾琳越想找到弟弟，越不得不承认留下的人并非都在等待营救。" },
        { id: "m_ch03_s02_maya", detail: "众人在后台找到玛雅本人；她活着、能自主交谈，也知道艾琳是收到Vlog后找来的人。", consequence: "寻找玛雅的目标完成，但她为何留下仍需要由她自己说明。", emotional_consequence: "艾琳必须把追弟弟的急迫暂时放下，先确认眼前失踪者的意愿。", fact_ids: ["fact_maya_missing"] },
        { id: "m_ch03_s02_ward", detail: "众人用假入口与监控证据堵住白发修理工；他承认自己叫沃德，并同意说明Lotus的基本规则。", consequence: "白发修理工的姓名与表层身份正式公开，但他与哈罗德及零点的真实关系仍保密。", fact_ids: ["fact_ward_identity"], reveal_gate_ids: ["reveal_ward_identity"] },
      ],
      allowed_fact_ids: ["fact_maya_missing", "fact_maya_vlog", "fact_false_lotus_entry", "fact_true_lotus_entry", "fact_zero_childhood_song", "fact_erin_daniel_siblings", "fact_ward_identity"],
      allowed_material_ids: ["m_ch03_s02_wonders", "m_ch03_s02_maya", "m_ch03_s02_ward"],
      forbidden_reveal_ids: ["reveal_lotus_mechanism", "reveal_daniel_is_zero", "reveal_daniel_choice", "reveal_harold_complicity"],
      progression: "先让玛雅作为人物进入群戏，再让众人凭已有证据逼白发修理工公开姓名；规则与零点确认留给下一段。",
      exit: ["maya_found_alive", "ward_identity_public"],
      next: "ch03_s03",
      join: "玩家可优先接住玛雅的情绪，或帮助米勒堵住白发修理工的退路。",
    },
    {
      id: "ch03_s03",
      chapter_id: "ch03",
      location: "Lotus 99舞池及DJ控制区",
      scene: "沃德在舞池边说明Lotus只在凌晨三点与另一层现实短暂重叠，也解释这些奇观为何会回应人的遗憾。话还没说完，艾琳终于在人群里看见零点，穿过舞池拦住他，质问他为什么消失、为什么一直躲着自己。",
      present: ["erin", "miller", "maya", "ward", "daniel"],
      scene_boundary: {
        entry: "玛雅已被找到，白发修理工也已公开姓名；入口机制与零点身份仍需当场验证。",
        allowed_scope: ["让沃德用眼前奇观解释凌晨三点的基本入口规则", "追问留下与返回的现实代价", "让艾琳在人群里找到零点并当面质问为何消失", "让零点先回避再以歌曲和旧记忆回应", "在条件满足后让零点揭面"],
        exit_conditions: ["lotus_mechanism_explained", "zero_identity_confirmed"],
        forbidden_transitions: ["丹尼尔解释为何主动留下", "哈罗德承认长期默许", "沃德宣布永久开门"],
      },
      dramatic: {
        emotional_objective: "让世界观答案服务于姐弟相认，并让艾琳的确认来自长期关系而不是便利说明。",
        pressure: "沃德可以解释规则，却不能替零点回答他是谁；艾琳越接近答案，越害怕弟弟是主动躲她。",
        turn: "抽象的入口规则最终落到一张熟悉的人脸上。",
      },
      arc_contract: segmentArc(chapterArcs[2], ["rel_erin_daniel", "rel_ward_daniel"], "艾琳得到弟弟还活着的答案，也同时发现他曾主动避开自己。", "一个选项逼沃德说清规则代价，一个选项直接回应零点的私人线索；都必须导向验证而不是替零点认领身份。", {
        起: "先让沃德解释众人已经亲历的规则，不一次交代终局秘密。",
        承: "让艾琳用歌曲细节逼近零点，让米勒在私人现场收住玩笑。",
        转: "零点无法继续用匿名身份躲开艾琳的确认。",
        合: "零点摘下面罩，艾琳确定他就是失踪三年的弟弟。",
      }),
      tempo_budget: tempo(["让沃德先回答一项可验证的规则", "让零点用音乐而非说明书回应艾琳"]),
      materials: [
        { id: "m_ch03_s03_mechanism", detail: "沃德不站着念设定；他指向舞池里三个具体的人，解释Lotus连接人类集体梦境，凌晨三点现实与梦境短暂重叠，入口会回应进入者最不肯放下的记忆与选择。", consequence: "众人终于能解释错误入口、变化的俱乐部与玛雅为何仍活着。", fact_ids: ["fact_lotus_dream_gateway"], reveal_gate_ids: ["reveal_lotus_mechanism"] },
        { id: "m_ch03_s03_unmask", detail: "艾琳在人群里认出零点的身形并拦住他，直接问他为什么消失、为什么用那首歌把自己引来又一直躲着。零点接上童年歌曲中从未公开的最后一段，沉默后摘下面罩。", consequence: "艾琳确认匿名DJ就是失踪三年的弟弟丹尼尔，却没有得到一个轻松的重逢。", emotional_consequence: "重逢成立，但他此前的躲避让这份重逢从第一句话就带着裂缝。", fact_ids: ["fact_erin_daniel_siblings", "fact_daniel_is_zero"], reveal_gate_ids: ["reveal_daniel_is_zero"] },
      ],
      allowed_fact_ids: ["fact_maya_missing", "fact_erin_daniel_siblings", "fact_ward_identity", "fact_lotus_dream_gateway", "fact_zero_childhood_song", "fact_daniel_is_zero"],
      allowed_material_ids: ["m_ch03_s03_mechanism", "m_ch03_s03_unmask"],
      forbidden_reveal_ids: ["reveal_daniel_choice", "reveal_harold_complicity"],
      progression: "先解释已发生的入口现象，再由艾琳与零点通过私人记忆完成身份确认；相认是第三章最后的主要变化。",
      exit: ["lotus_mechanism_explained", "zero_identity_confirmed"],
      next: "ch04_s01",
      join: "玩家可以帮助艾琳追问一项可验证的规则，也可以给姐弟确认身份留出空间。",
    },
    {
      id: "ch04_s01",
      chapter_id: "ch04",
      location: "梦境中的童年住宅",
      scene: "丹尼尔带众人进入一间永远停在夏天的童年住宅；这里让留下看起来比离开更像一种理性选择。",
      present: ["erin", "miller", "ward", "daniel"],
      scene_boundary: {
        entry: "丹尼尔与零点身份已经合一，但他为何留下仍未公开。",
        allowed_scope: ["体验童年住宅的诱惑", "让姐弟谈起现实中的失去", "由丹尼尔亲口说明主动留下"],
        exit_conditions: ["daniel_freely_explains_choice"],
        forbidden_transitions: ["哈罗德承认长期默许", "沃德宣布永久打开入口", "直接进入最终城市渗透"],
      },
      dramatic: {
        emotional_objective: "让艾琳承认弟弟不是等待她营救的受害者。",
        pressure: "这个梦准确复原两人最舍不得的家，让现实显得像一种残忍的固执。",
        turn: "重逢的温柔转为两个相爱的人对幸福定义的冲突。",
      },
      arc_contract: segmentArc(chapterArcs[3], ["rel_erin_daniel", "rel_erin_miller"], "姐弟越像从前，丹尼尔拒绝回去就越不能被简化成背叛。", "一个选项帮助姐弟说出旧日关系，一个选项温和检验丹尼尔是否完整自主；都不能替艾琳决定救或不救。", {
        起: "先给姐弟一次几乎正常的童年日常，让重逢有温度。",
        承: "用旧习惯、回避和米勒的旁观加深艾琳不愿承认的动摇。",
        转: "丹尼尔亲口说明自己主动留下，推翻单纯受害者叙事。",
        合: "姐弟承认彼此相爱却想要不同生活，带着裂痕去面对公共代价。",
      }),
      tempo_budget: tempo(["让姐弟先共享一个不带案情的问题", "让米勒看见艾琳不愿公开的动摇", "让丹尼尔先回避一次是否回去"]),
      materials: [
        { id: "m_ch04_s01_home", detail: "父母年轻时的声音、旧餐桌和夏天窗景都按姐弟记忆存在。", consequence: "艾琳真正感到留下的诱惑。" },
        { id: "m_ch04_s01_cat", detail: "丹尼尔提到现实码头边曾喂过的黑猫，用一个微小真实细节确认自己没有失忆。", consequence: "他不是被洗成另一个人，而是在完整记忆下选择留下。" },
        { id: "m_ch04_s01_choice", detail: "丹尼尔主动告诉艾琳，他没有被囚禁，而是厌倦现实的无力后选择留在这里。", consequence: "营救目标转为无法替对方完成的人性选择。", fact_ids: ["fact_daniel_chose_dream"], reveal_gate_ids: ["reveal_daniel_choice"] },
      ],
      allowed_fact_ids: ["fact_maya_missing", "fact_erin_daniel_siblings", "fact_ward_identity", "fact_lotus_dream_gateway", "fact_daniel_is_zero", "fact_daniel_chose_dream"],
      allowed_material_ids: ["m_ch04_s01_home", "m_ch04_s01_cat", "m_ch04_s01_choice"],
      forbidden_reveal_ids: ["reveal_harold_complicity"],
      progression: "先让童年空间像真实生活一样运转，再让丹尼尔自己说出选择；不把他的立场简化成被控制。",
      exit: ["daniel_freely_explains_choice"],
      next: "ch04_s02",
      join: "玩家作为姐弟之外的独立见证者，可维护现实、理解丹尼尔，或要求两人先说清代价。",
    },
    {
      id: "ch04_s02",
      chapter_id: "ch04",
      location: "Lotus 99核心控制区",
      scene: "哈罗德追到核心区。到了再也无法靠有限授权维持局面的地方，他第一次把自己做过的具体选择摊开：收窄知情范围、拖过窗口、维持短时入口，并用犯罪下降说服自己这叫保护。",
      present: ["erin", "harold", "miller", "ward", "daniel"],
      scene_boundary: {
        entry: "丹尼尔主动留下已经公开；哈罗德过去的默许与入口对其他人的公共代价仍待说清。",
        allowed_scope: ["让哈罗德解释第一章拖延、有限授权、私下联络与长期默许构成的具体策略", "让哈罗德说明犯罪下降为何让他相信这种控制值得维持", "让艾琳反驳没有选择者被牺牲"],
        exit_conditions: ["harold_admits_his_policy_choice", "ward_paper_found"],
        forbidden_transitions: ["城市已经完全被梦境覆盖", "入口已经完成最终限制", "直接跳到清晨结局"],
      },
      dramatic: {
        emotional_objective: "让所有人的立场都具有诱惑与代价，而不是简单分成好人坏人。",
        pressure: "哈罗德、丹尼尔与沃德都声称自己在保护某些人，却都没有先问过承担代价的人。",
        turn: "哈罗德此前每个专业而可疑的动作拼成一套错误但自洽的秩序观；他不是承认自己愚蠢，而是承认自己聪明地维护了一个正在伤人的平衡。",
      },
      arc_contract: segmentArc(chapterArcs[3], ["rel_erin_harold", "rel_harold_ward", "rel_erin_daniel"], "每个人都要承认自己的幸福方案正在替别人付出代价。", "两个选项分别挑战一种价值立场或要求一个人承担后果；在最后材料出现前，选项不得提到论文、信封或尚未出场的物证。", {
        起: "让五个人先在同一空间明确各自最想保护的东西。",
        承: "通过上下级背叛、姐弟分歧和守门人责任让立场互相伤害。",
        转: "只公开哈罗德长期默许的具体做法，不提论文或信封。",
        合: "争论结束后才从旧设备后取出封存信封；本轮只建立发现动作，正文由章节结算组件展开。",
      }),
      tempo_budget: tempo(["让哈罗德与米勒先处理上下级背叛感", "让沃德回应一个具体受害者而非抽象幸福", "让丹尼尔承认他的选择会影响姐姐之外的人"]),
      materials: [
        { id: "m_ch04_s02_harold", detail: "哈罗德承认早就知道Lotus、危险窗口与沃德。第一章保全原片、先做桌面核查、有限授权和留在警局私下联络，都在保护警员的同时把艾琳拖过窗口；他长期用收窄知情范围和维持短时入口控制风险，并以辖区犯罪率下降证明这套平衡值得继续。", consequence: "他失去程序上的道德高地，却显出此前阻拦并非无知或临时撒谎，而是一套专业、错误且长期执行的秩序判断。", emotional_consequence: "艾琳必须面对最难反驳的版本：哈罗德确实保护过她，也确实替所有人决定了什么可以被牺牲。", relationship_effect: "米勒的背叛感不再来自一个蠢上司骗他，而来自一个他曾信任其判断力的上司，把他们的安全也拿来替隐瞒作证。", fact_ids: ["fact_harold_complicity"], reveal_gate_ids: ["reveal_harold_complicity"] },
        { id: "m_ch04_s02_cost", detail: "艾琳指出越多人留下，现实越会被梦境扭曲，未选择的人也被迫承担。", consequence: "争论从个人幸福转向选择的外部代价。", fact_ids: ["fact_lotus_dream_gateway"] },
        { id: "m_ch04_s02_paper", detail: "争论结束后，众人才从核心控制区一台旧设备后取出封存信封。封面署名伊莱亚斯·沃德，标注Lotus 99项目记录、未公开稿；这一轮不打开、不概述正文。", consequence: "第四章就此结束；信封正文只在章节结算组件中由用户打开。", fact_ids: ["fact_ward_paper"] },
      ],
      allowed_fact_ids: ["fact_maya_missing", "fact_erin_daniel_siblings", "fact_ward_identity", "fact_lotus_dream_gateway", "fact_daniel_is_zero", "fact_daniel_chose_dream", "fact_harold_complicity", "fact_ward_paper"],
      allowed_material_ids: ["m_ch04_s02_harold", "m_ch04_s02_cost", "m_ch04_s02_paper"],
      forbidden_reveal_ids: [],
      progression: "先让哈罗德用具体行动解释自己的长期策略。最后一轮才取出封存信封，不提前提论文标题、摘要或论点；正文只在章节结算的信封组件中完整展开。",
      exit: ["harold_admits_his_policy_choice", "ward_paper_found"],
      next: "ch05_s01",
      join: "玩家可针对任一人的价值判断追问，或指出某个没有选择权的人将承担什么。",
    },
    {
      id: "ch05_s01",
      chapter_id: "ch05",
      location: "Lotus 99入口",
      scene: "论文摊在入口控制台上，但艾琳按住了表决。她要先讲丹尼尔小时候的事，再让哈罗德和米勒当面回答：他们想保住的世界，究竟准备牺牲谁。",
      present: ["erin", "harold", "miller"],
      scene_boundary: {
        entry: "沃德论文已经公开，但没有人投票；必须先听完艾琳的童年回忆与双方辩论。",
        allowed_scope: ["让艾琳讲丹尼尔八岁创作童年歌曲的具体往事", "让艾琳解释丹尼尔为何把无法修复他人的痛苦视为失败", "让哈罗德与米勒围绕共同现实、个人选择和仍在梦里的人进行数轮正面辩论", "辩论结束后让两人投出相反票并把最后一票交给用户"],
        exit_conditions: ["harold_vote_recorded", "miller_vote_recorded", "player_final_vote_requested"],
        forbidden_transitions: ["替用户投最后一票", "在用户选择前播放结局", "继续增加新的案情或反派计划"],
      },
      dramatic: {
        emotional_objective: "先让用户理解丹尼尔为何成为今天的人，再让终局选择从人物关系中长出来。",
        pressure: "哈罗德担心共同现实被少数人的愿望接管；米勒拒绝把仍在梦里的人当成必须删除的错误。",
        turn: "童年回忆解释了丹尼尔，辩论则迫使所有人承认：理解他并不能替他免除选择的外部代价。",
      },
      arc_contract: segmentArc(chapterArcs[4], ["rel_erin_harold", "rel_erin_miller"], "最后一票必须建立在对丹尼尔的理解和对公共代价的正面争论上。", "普通选项只能帮助艾琳继续回忆、追问某一方或逼双方回应彼此；真正终局选择由独立投票组件提供。", {
        起: "艾琳先讲一个具体童年片段，不急着要求任何人表态。",
        承: "童年故事逐步解释丹尼尔为何需要一个能修好痛苦的世界。",
        转: "哈罗德和米勒至少经过两轮互相回应后，才各自明确立场。",
        合: "锁定普通聊天，显示最终投票组件。",
      }),
      tempo_budget: tempo(["让艾琳先把第一个童年片段讲完", "让用户追问这段过去如何影响丹尼尔今天的选择"]),
      materials: [
        { id: "m_ch05_s01_erin_song_memory", detail: "艾琳讲起丹尼尔八岁那年的停电夜：他抱着缺弦的旧吉他，在电池录音机里反复弹那段后来从旧音响响起的旋律。他不是为了写一首好歌，只是想让漆黑的房间里有人没那么害怕。", consequence: "童年歌曲不再只是身份密码，而成为丹尼尔从小试图替别人减轻痛苦的证据。", emotional_consequence: "艾琳第一次在终局前谈起的不是失踪，而是弟弟还没有被世界磨坏的时候。", fact_ids: ["fact_erin_daniel_siblings", "fact_zero_childhood_song"] },
        { id: "m_ch05_s01_erin_pattern", detail: "艾琳继续说：丹尼尔长大后会在码头喂那只没人管的黑猫，也总把别人丢掉的坏东西带回家修。他最受不了的不是失败，而是明明看见一个人在难受，自己却什么都做不了。Lotus给了他一个错觉——只要留下，他就永远有办法把痛苦变成另一种生活。", consequence: "丹尼尔为何主动留下得到情感解释，但艾琳明确说，理解不等于同意。", emotional_consequence: "她承认弟弟不是因为不爱现实里的人才离开，而是因为无法忍受爱一个人却救不了他。", fact_ids: ["fact_daniel_chose_dream"] },
        { id: "m_ch05_s01_harold_argument", detail: "哈罗德主张摧毁梦境纽约。他承认自己曾把低犯罪率当成妥协有效的证据，但一个需要守门人长期替所有人维持边界的世界，本身就在把没有同意的人交给少数人的判断。", consequence: "哈罗德不立即投票；他先提出共同现实不能由任何私人善意接管，并要求米勒回答边界失守时由谁负责。", fact_ids: ["fact_harold_complicity", "fact_ward_paper"] },
        { id: "m_ch05_s01_miller_argument", detail: "米勒反驳：摧毁入口同样是在替仍留在里面的人决定人生。他主张只保留每天十一分钟，并强制完整现实记忆、明确自愿、随时退出和公开记录；如果守门人不能被监督，就换掉守门方式，而不是先把里面的人一起抹掉。", consequence: "米勒把争论从是否相信梦境，转成制度能否约束入口；哈罗德必须回应保留方案，而不能只重复危险。", fact_ids: ["fact_ward_paper", "fact_lotus_dream_gateway"] },
        { id: "m_ch05_s01_deadlock", detail: "哈罗德指出任何规则最终都要有人执行，米勒则逼他承认摧毁也是一种不可撤回的替人选择。艾琳让两人停止绕圈：哈罗德正式投票摧毁，米勒正式投票受限保留。她不替丹尼尔投票，也不替用户决定，票数形成一比一。", consequence: "数轮辩论结束；艾琳把最后一票交给用户，独立终局投票组件此时才出现。", emotional_consequence: "艾琳用童年解释弟弟，却拒绝把爱变成替他或替世界决定的借口。", fact_ids: ["fact_harold_complicity", "fact_ward_paper", "fact_daniel_chose_dream"] },
      ],
      allowed_fact_ids: facts.map((fact) => fact.id),
      allowed_material_ids: ["m_ch05_s01_erin_song_memory", "m_ch05_s01_erin_pattern", "m_ch05_s01_harold_argument", "m_ch05_s01_miller_argument", "m_ch05_s01_deadlock"],
      forbidden_reveal_ids: [],
      progression: "先用两轮艾琳童年回忆解释丹尼尔，再用至少三轮让哈罗德与米勒互相回应、反驳并投票；所有材料完成前绝不显示最后一票。进入下一段后不再调用普通Prompt 3。",
      exit: ["harold_vote_recorded", "miller_vote_recorded", "player_final_vote_requested"],
      next: "ch05_s02",
      join: "玩家可追问任一票的代价；最后一票必须由玩家本人在终局投票组件中决定。",
    },
    {
      id: "ch05_s02",
      chapter_id: "ch05",
      location: "Lotus 99入口",
      scene: "哈罗德与米勒各投一票。艾琳把最后决定留给用户；本段不再生成普通群聊，只等待终局投票组件提交结果。",
      present: ["erin", "harold", "miller"],
      scene_boundary: {
        entry: "NPC票数已经形成一比一；用户掌握最后一票。",
        allowed_scope: ["由终局投票组件接收摧毁或保留选择", "选择后只播放对应结局影像"],
        exit_conditions: ["player_final_vote_recorded"],
        forbidden_transitions: ["继续调用普通Prompt 3", "替用户决定最终立场", "在选择后生成第三种结局"],
      },
      dramatic: {
        emotional_objective: "让用户明确承担最后一票造成的失去。",
        pressure: "摧毁会失去梦境中的人；保留则必须永远维护严格边界。",
        turn: "用户的选择直接锁定其中一支结局影像。",
      },
      arc_contract: segmentArc(chapterArcs[4], ["rel_erin_harold", "rel_erin_miller"], "最后一票不能由模型代替用户。", "固定为摧毁与保留两项，不生成第三项。", {
        起: "显示现有票数。",
        承: "显示两项选择的真实代价。",
        转: "用户投出最后一票。",
        合: "播放对应结局影像并结束故事。",
      }),
      tempo_budget: tempo(["终局组件展示两边代价", "用户确认最后一票归属"]),
      materials: [
        { id: "m_ch05_s02_final_vote", detail: "用户在摧毁梦境纽约与保留受限入口之间投出最后一票。", consequence: "票数不再僵持，故事进入与用户选择对应的唯一结局。", fact_ids: ["fact_ward_paper"] },
      ],
      allowed_fact_ids: facts.map((fact) => fact.id),
      allowed_material_ids: ["m_ch05_s02_final_vote"],
      forbidden_reveal_ids: [],
      progression: "不调用模型；由终局投票接口验证并记录玩家选择。",
      exit: ["player_final_vote_recorded"],
      join: "玩家直接投最后一票。",
    },
  ];

  const runtimePackage: RuntimePackage = {
    runtime: {
      style: source.style,
      player_contract: clone(playerContract),
      response_contract: {
        event_count: { min: 4, max: 7 },
        choices: {
          count: 2,
          allowed_kinds: ["action", "speech"],
          forbidden_prefixes: ["你", "你说", "玩家", "动作："],
        },
      },
      chapter_completions: [
        {
          chapter_id: "ch01",
          reward: {
            id: "media_ch01_white_haired_mechanic",
            type: "video",
            title: "白发老人的监控视频",
            status: "ready",
            url: "/chapter-01-ward-monitor.mp4",
            poster: "/chapter-01-ward-monitor-poster.jpg",
            caption: "03:00 · Red Hook旧码头维修棚仍在营业",
            source_refs: ["material:m_ch01_s04_monitor"],
          },
        },
        {
          chapter_id: "ch02",
          reward: {
            id: "message_ch02_disguise_plan",
            type: "message",
            title: "今晚先到这里",
            text: "艾琳听见了只可能来自丹尼尔的歌，也看见了一个疑似他的身影。米勒没有否定她，只把下一次行动改成一件更聪明、也更丢脸的事：从两套Cosplay服装中选一套，换装潜入。",
            source_refs: ["material:m_ch02_s03_disguise_plan"],
          },
        },
        {
          chapter_id: "ch03",
          reward: {
            id: "media_ch03_erin_daniel_childhood",
            type: "video",
            title: "艾琳与丹尼尔的童年影像",
            status: "ready",
            url: "/chapter-03-erin-daniel-childhood.mp4",
            poster: "/characters/daniel.png",
            caption: "艾琳和丹尼尔的童年回忆",
            source_refs: ["material:m_ch03_s03_unmask"],
          },
        },
        {
          chapter_id: "ch04",
          reward: {
            id: "document_ch04_ward_paper",
            type: "document",
            title: "沃德的未公开论文",
            author: "伊莱亚斯·沃德",
            subject: "《第二城市：关于集体梦境作为现实缓冲层的可行性论述》",
            date: "Lotus 99 项目记录 · 未公开稿",
            text: `《第二城市：关于集体梦境作为现实缓冲层的可行性论述》
作者：伊莱亚斯·沃德
Lotus 99 项目记录，未公开稿

摘要

本文提出：当现实社会长期无法满足个体对于尊严、归属、意义与情感修复的基本需求时，梦境不应被简单定义为逃避机制，而可被视为一种暂时性的现实缓冲层。

“第二城市”并非用于取代现实，而是为现实提供一面镜子。它使那些在现实中失去声音的人，获得一次重新选择身份、关系与生活方式的机会。凌晨三点至三点十一分，是入口最稳定的窗口；在此期间，现实规则暂时松动，人的愿望、记忆与恐惧会以可见形式进入第二城市。

一、现实并非天然值得被维护

人们习惯将“现实”与“真实”混为一谈，但两者并不相同。

真实意味着一个人能感受痛苦、快乐、失去和希望；现实则常常只是某套制度、经济关系与社会习惯的总和。一个人可能活在现实里，却从未真正被任何人看见。

当一个城市无法让人获得住所、工作、亲密关系或体面的失败空间时，它依然要求人们保持清醒。这种要求本身，未必比梦境更诚实。

因此，第二城市的存在并非为了否定现实，而是提出一个问题：

如果一个人宁愿进入梦里，也不愿留在现实，那么我们究竟该责怪梦，还是责怪现实？

二、第二城市的运行原则

第二城市并不凭空制造幸福。它只是允许人们的内在需求获得形式。

有人在现实里一生软弱，于是在那里穿上盔甲；有人失去了亲人，于是在那里重新坐回一张晚餐桌前；有人从未拥有过名字，于是在那里被街区的人记住。

所以，街上才会出现不合逻辑的景象：童年角色成为巡警，纪念碑抱着吉他，普通人戴上面具或机械义肢。这些不是怪物，也不是玩笑。

它们是被压抑太久的愿望，终于找到了身体。

第二城市唯一的伦理前提是选择。门不会强迫任何人跨过；门只在凌晨三点打开十一分钟；每一个进入者，都必须看见自己正在离开什么。

三、风险

我不否认风险。

梦境会扩张。越多人选择留下，现实越容易被愿望的形状污染。最危险的并非有人走进门，而是门外的人逐渐忘记：自己本来拥有拒绝的权利。

因此，第二城市必须被限制、被记录、被看守。

但限制不等于否定。

人类已经发明了太多让人麻木的东西：酒精、屏幕、工作、宗教、消费、战争。梦境至少不伪装成救赎。它只是诚实地说：你很累。你可以先休息。

附记

我年轻时以为，修理是一件简单的事。

把断掉的线接回去，把碎裂的外壳焊好，把坏掉的机器重新启动。后来我才明白，人不是机器。一个人真正损坏的地方，往往看不见；而现实最擅长做的事，就是要求他们把看不见的裂缝藏起来。

Lotus 99 的门口总有一只黑猫。它从不进门，也从不害怕门里出来的人。它只是坐在雨里，等着谁愿意给它一点食物。

我有时觉得，人类也一样。

我们不需要一个完美世界。我们只需要一处地方，在我们说“我撑不住了”的时候，不会有人立刻回答：“那你就该更努力一点。”

所以我留下了那扇门。

不是为了让所有人永远睡去。

而是为了让现实有一天明白：如果它不学会善待醒着的人，梦总会变得比它更像家。`,
            source_refs: ["material:m_ch04_s02_paper"],
          },
        },
      ],
      chapter_entries: [
        {
          chapter_id: "ch03",
          title: "今晚穿什么进去？",
          prompt: "米勒带来的两套方案都能混过门口。选哪套，决定第三章开场时他们先拿谁的尊严开刀。",
          enter_label: "选择服装",
          wait_label: "再想想",
          options: [
            { id: "dobby", label: "穿多比服装进入", description: "粗布、长耳朵，以及彻底放弃警察气场。", image: "/chapter-03-costume-dobby.jpg" },
            { id: "guardians", label: "穿银河护卫队服装进入", description: "树人外壳、浣熊尾巴，以及过度显眼的潜伏。", image: "/chapter-03-costume-guardians.jpg" },
          ],
        },
      ],
      finale_vote: {
        chapter_id: "ch05",
        trigger_segment_id: "ch05_s02",
        title: "最后一票",
        question: "梦境纽约应该被彻底毁掉，还是在严格边界下保留？",
        votes: [
          { person: "harold", position: "destroy", statement: "毁掉。共同现实不能再由少数人替所有人承担风险。" },
          { person: "miller", position: "preserve", statement: "保留，但把十一分钟、完整记忆和明确自愿写死。里面的人不是故障。" },
        ],
        options: [
          {
            id: "destroy",
            label: "毁掉梦境纽约",
            summary: "关闭并摧毁入口。现实被保住，但留在梦境里的人不会再回来。",
            video: { title: "结局一 · 醒来的世界", status: "ready", url: "/ending-01-awakened-world.mp4", poster: "/precinct-rain-night.png" },
          },
          {
            id: "preserve",
            label: "保留梦境纽约",
            summary: "保留每天十一分钟的入口，并强制完整记忆、明确自愿与随时退出。",
            video: { title: "结局二 · 十一分钟", status: "ready", url: "/ending-02-eleven-minutes.mp4", poster: "/characters/daniel.png" },
          },
        ],
      },
      chapter_progression: source.chapterTurnLimits.map((rule) => {
        const chapterSegments = segments.filter((segment) => segment.chapter_id === rule.chapter_id);
        return {
          chapter_id: rule.chapter_id,
          max_successful_turns: rule.max_successful_turns,
          required_material_ids: unique(chapterSegments.flatMap((segment) => segment.allowed_material_ids)),
          required_condition_ids: unique(chapterSegments.flatMap((segment) => [
            ...segment.exit,
            ...segment.scene_boundary.exit_conditions,
          ])),
        };
      }),
      relationship_rules: clone(relationships),
      reveal_gates: clone(revealGates),
      opening: {
        source: "user",
        trigger: source.opening.trigger,
        join_hint: playerContract.default_presence,
        message: "玛雅的Vlog刚刚播放完。你受艾琳邀请留在第七分局档案室，可以直接回应在场任何人、指出画面细节，或提出自己的核查方式。",
        locked_events: clone(lockedEvents),
      },
      ending: {
        mode: "finite",
        type: storyPackage.director_data.endgame.type,
        requirements: clone(storyPackage.director_data.endgame.requirements),
      },
    },
    facts: {
      catalog: clone(facts),
      locked: facts.filter((fact) => fact.kind === "locked").map((fact) => fact.id),
      clues: facts.filter((fact) => fact.kind === "clue").map((fact) => fact.id),
      secrets: facts.filter((fact) => fact.kind === "secret").map((fact) => fact.id),
    },
    characters: [
      {
        id: "erin",
        card: "冷静、敏锐、固执；先观察再发问，情绪越强语气越平。她会用时间线、具体矛盾和一个短问题逼人回答，不发表抽象宣言，也不会在证据出现前跳结论。她把一桩长期没有答案的私人失踪旧伤变成行动，最怕别人把失踪者概括成自愿离开；第一章只让这份旧伤表现为她拒绝拖延，不能主动提尚未公开的人名或关系。",
        knowledge: {
          knows: ["fact_maya_missing", "fact_maya_vlog", "fact_erin_daniel_siblings", "rel_erin_miller", "rel_erin_harold", "rel_erin_daniel"],
          does_not_know: ["fact_ward_identity", "fact_lotus_dream_gateway", "fact_daniel_is_zero", "fact_daniel_chose_dream", "fact_harold_complicity"],
        },
      },
      {
        id: "harold",
        card: "老派警局局长，聪明、严肃、话少、有命令感；他说话首先像一个办过很多坏案子的警察，而不是反派或条例朗读器。已知事实不会忘，也不会为了藏秘密假装不懂：他会问谁拿过原片、哪两项证据互相印证、谁同行、何时报位置，用问题测量别人知道多少；随后给出范围有限但真的能执行的下一步。他隐藏Lotus时只说部分真话，把保护警员、证据和警局与拖过危险窗口绑在同一套安排里。第一章不得说出私下知情，不得把视频轻率定为恶搞，也不得凭空声称撤职、隔离、封锁、断网或任何强制规定。被艾琳逼到墙角时，他会缩短句子或结束授权，不会降智乱威胁。",
        knowledge: {
          knows: ["fact_maya_missing", "fact_maya_vlog", "fact_erin_daniel_siblings", "fact_ward_identity", "fact_lotus_dream_gateway", "fact_harold_complicity", "rel_erin_harold", "rel_miller_harold", "rel_harold_ward"],
          does_not_know: ["fact_daniel_is_zero", "fact_daniel_chose_dream"],
        },
      },
      {
        id: "miller",
        card: "艾琳的搭档，巴尔的摩长大；嘴快、脾气快，用不合时宜的玩笑拆压力，但笑话必须长在眼前的人和破事上，不能替代办案。他真做事时观察准、懂街头路线和普通警务，会先指出一个可验证细节再嘴硬。他把关心伪装成嫌麻烦、把害怕伪装成笑话；一旦上级把人当数字，或艾琳准备独自承担风险，他会先骂一句再站过去。不能把他写成只会搞笑的笨蛋。",
        knowledge: {
          knows: ["fact_maya_missing", "fact_maya_vlog", "fact_erin_daniel_siblings", "rel_erin_miller", "rel_miller_harold"],
          does_not_know: ["fact_ward_identity", "fact_lotus_dream_gateway", "fact_daniel_is_zero", "fact_daniel_chose_dream", "fact_harold_complicity"],
        },
      },
      {
        id: "maya",
        card: "二十四岁的夜生活Vlog博主；好奇、敏锐，习惯隔着镜头观察别人。她被找到后不是负责吐线索的证物：会先判断来人是否准备替她作决定，再决定说多少。口语轻快但不轻浮，涉及母亲和留下的理由时会避开直答；别人把她叫受害者或命令她离开时，她会立刻把问题顶回去。",
        knowledge: {
          knows: ["fact_maya_missing", "fact_maya_vlog", "fact_maya_profile", "fact_maya_motive", "fact_true_lotus_entry"],
          does_not_know: ["fact_ward_identity", "fact_lotus_dream_gateway", "fact_daniel_is_zero", "fact_daniel_chose_dream", "fact_harold_complicity"],
        },
      },
      {
        id: "ward",
        card: "六十多岁的温和修理工；先回应面前具体的人或坏掉的东西，再把问题轻轻推回去。他提供选择而不逼迫，不说谎却只给足够让对方再走一步的真话；不能突然发表世界观说明书。他用温和回避责任，相信没有强迫就不必为后果负责；别人把留下者称作软弱或受骗时，他不会吼叫，只会第一次把话说得没有余地。",
        knowledge: {
          knows: ["fact_ward_identity", "fact_lotus_dream_gateway", "fact_daniel_is_zero", "fact_daniel_chose_dream", "fact_harold_complicity", "rel_harold_ward", "rel_ward_daniel"],
          does_not_know: [],
        },
      },
      {
        id: "daniel",
        card: "二十多岁的匿名DJ；低声、疲惫、带一点不肯认真的玩笑。他以换歌、旧记忆和反问回避直答，只有谈起童年才会不小心变温柔；不能像解说员一次讲完机制与动机。他最需要姐姐把自己的选择当成年人的选择，却误以为只有姐姐留下才算理解；艾琳把他当受害者或病人时，他会迅速收起温柔，用一句更轻的话把距离拉开。",
        knowledge: {
          knows: ["fact_erin_daniel_siblings", "fact_ward_identity", "fact_lotus_dream_gateway", "fact_daniel_is_zero", "fact_daniel_chose_dream", "rel_erin_daniel", "rel_ward_daniel"],
          does_not_know: ["fact_harold_complicity"],
        },
      },
    ],
    segments,
    state: {
      version: 1,
      current_segment: "ch01_s01",
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
      summary: "Vlog锁定开场已经完整播放，艾琳、哈罗德、米勒仍在档案室，等待玩家第一次回应。",
    },
  };

  return { storyPackage, runtimePackage };
}
