export type Person = "erin" | "harold" | "miller" | "maya" | "ward" | "daniel";
export type Message = { id: number; person?: Person; label?: string; text: string; kind?: "system" | "player" };
type StoryRelationship = { characters: Person[]; publicFact: string; directorNote?: string; revealFromChapter?: number };

// StoryPackage 的互动层：更换剧情卡时，只替换这份数据，不改场景编剧的通用规则。
export const storyInteraction = {
  player: {
    defaultPresence: "受邀留在现场的独立外部来访者；姓名、职业、性别和与案件的关系都由玩家自行决定。",
    canDo: ["观察、发问、表达立场、提供自己的线索、协助或拒绝协助", "影响人物之间的选择，但不替任何角色作决定"],
    cannotReplace: ["艾琳与米勒的办案功能", "哈罗德的警局决策功能", "玛雅作为失踪者亲自表达选择的功能", "沃德的 Lotus 修理与守门功能", "丹尼尔的 DJ、失踪者与梦境锚点功能"],
  },
  relationships: [
    { characters: ["erin", "miller"], publicFact: "共同办案的搭档。艾琳负责判断方向、追紧关键问题；米勒负责现场支援、街头直觉和拆气氛。两人可以拌嘴，但风险到来时站在同一边。" },
    { characters: ["erin", "harold"], publicFact: "上级与下属，也是长期互不服气的旧同事。哈罗德能压程序，艾琳能顶回来。" },
    { characters: ["miller", "harold"], publicFact: "局长与警官。米勒会顶嘴、会用笑话绕开压力，但不能越过哈罗德决定警局行动。" },
    { characters: ["erin", "daniel"], publicFact: "姐弟。丹尼尔三年前在 Lotus 99 失踪。", directorNote: "第一、二章不得揭示丹尼尔就是“零点”。", revealFromChapter: 3 },
    { characters: ["ward"], publicFact: "Lotus 99 的修理工和守门人。", directorNote: "他的真实动机要循章节逐步揭开。" },
    { characters: ["harold", "ward"], publicFact: "暂无公开交情。", directorNote: "哈罗德知道得比他说得多；第一章只能表现为他急于收束案件，不能解释原因。" },
    { characters: ["ward", "daniel"], publicFact: "暂无公开关系。", directorNote: "两人的完整关系是后续秘密，前两章不得直说。", revealFromChapter: 3 },
  ] satisfies StoryRelationship[],
};

export const cast: Record<Person, { name: string; role: string; image: string; bio: string }> = {
  erin: { name: "艾琳", role: "失踪案警探", image: "/characters/erin.png", bio: "冷静、敏锐、固执。弟弟丹尼尔三年前进入 Lotus 99 后失踪，她不接受用梦境交换现实。" },
  harold: { name: "哈罗德", role: "警局局长", image: "/characters/harold.png", bio: "老派、克制，习惯把案件压回秩序里。话不多，但开口常带刺、不给人留面子，懒得跟谁绕弯子，压人时一句话就能把对方钉在原地；他知道 Lotus 99 比自己承认的更多。" },
  miller: { name: "米勒", role: "艾琳的搭档警官", image: "/characters/miller.png", bio: "巴尔的摩长大，嘴快、脾气也快。拿不着调的玩笑和偶尔的粗口当护甲；看着不靠谱，偏偏最能记住街头和旧案里不该对上的细节。" },
  maya: { name: "玛雅", role: "失踪的夜生活博主", image: "/characters/maya.png", bio: "二十四岁的夜生活Vlog博主。好奇、敏锐，习惯隔着镜头观察别人。" },
  ward: { name: "沃德", role: "与 Lotus 99 有关的修理工", image: "/characters/ward.png", bio: "白发修理工，温和耐心，但从不一次把话说全；目前尚未进入现场。" },
  daniel: { name: "丹尼尔", role: "艾琳失踪的弟弟", image: "/characters/daniel.png", bio: "三年前进入 Lotus 99 后再未回到现实，目前行踪不明。" },
};

export const chapters = [
  { title: "失踪者", sub: "暴雨警局 · 02:59", scene: "雨夜的第七分局。局长在压案，艾琳不肯退；她的搭档米勒嘴上插科打诨，眼睛却盯住了一个谁都不愿碰的细节。", goal: "先弄清警局为什么急着压下玛雅的案子，再决定要不要打开她留下的 Vlog。", bg: "bg-station" },
  { title: "Lotus 99", sub: "码头区 · 02:49", scene: "你们已经在旧码头维修棚找到监控里的白发老人，交涉刚刚开始。那具黑色机甲还躺在他手边；刚才的监控里，他身后的门曾经打开。现在先问他见没见过玛雅，再问那扇门在哪里、通向哪里。", goal: "围绕维修棚监控继续询问老人：他是否见过玛雅，那扇打开过的门在哪里、通向什么地方。", bg: "bg-lotus" },
  { title: "另一座纽约", sub: "Cosplay Night · 03:00", scene: "乔装计划居然奏效了。你们穿着一套很难维持警察尊严的Cosplay服装走进真正的Lotus 99；先别急着找零点，这里每个看似玩笑的造型都可能是某个人最不肯放下的愿望。", goal: "在俱乐部的情感奇观中找到玛雅，听沃德说明这里的规则，再让艾琳亲自质问一直躲着她的零点。", bg: "bg-dream" },
  { title: "零点", sub: "核心控制区 · 03:05", scene: "姐弟已经相认。丹尼尔把众人带回核心控制区，哈罗德也赶到了。没人再争论零点是谁；现在要说清的是，丹尼尔为什么留下，以及哈罗德究竟隐瞒了多久。", goal: "听清丹尼尔主动留下的理由，逼哈罗德解释长期默许，并判断每个人真正想保护的是什么。", bg: "bg-zero" },
  { title: "凌晨三点", sub: "Lotus 99 · 最后一票", scene: "沃德的论文已经打开，但屋里还没有人投票。艾琳要求所有人先把话说完：她会讲丹尼尔小时候的事，也要哈罗德和米勒当面说清，他们各自准备牺牲谁。", goal: "听完艾琳的童年回忆与两方辩论；等哈罗德和米勒真正形成一比一，最后一票才会交到你手里。", bg: "bg-final" },
];

export const chapterMessages: Message[][] = [
  [
    { id: 1, kind: "system", text: "凌晨两点五十九分，第七分局还亮着几盏灯。雨敲着高窗，值班台堆满没归档的报告。三只纸杯搁在边上，咖啡早凉了。档案室的门留着一条缝，走廊里没人进来。" },
    { id: 2, kind: "system", text: "艾琳坐在桌前，低头试了两次电源，又把松动的插头往里按紧。哈罗德站在窗前，背对着房间。米勒靠着门框，端着一杯凉透的咖啡。播放器终于亮了。艾琳把它推到桌子中央，按下播放。屏幕里，玛雅站在 Lotus 99 门外，右上角的红点一下一下闪。" },
  ],
  [
    { id: 20, kind: "system", text: "Lotus 99 的门在午夜后才出现。空气里有机油、雨水和甜得发苦的雾。" },
    { id: 21, person: "ward", text: "进来的人，通常都知道自己在找什么。你们呢？" },
    { id: 22, person: "erin", text: "玛雅。还有一扇门。" },
  ],
  [
    { id: 30, kind: "system", text: "乔装计划居然奏效了。门卫甚至没有多看一眼，仿佛三个穿着成套Cosplay服装、还努力装作互不认识的人，正是Lotus 99最普通的客人。" },
    { id: 31, person: "miller", text: "提醒我一下，我们现在是在潜伏，还是在替错误的人生决定拍宣传照？" },
    { id: 32, person: "erin", text: "都闭嘴。先找玛雅。还有，别踩到彼此的尾巴。" },
  ],
  [
    { id: 40, person: "daniel", text: "姐，别站那么近。三点之后，我不保证自己还是我。" },
    { id: 41, person: "erin", text: "丹尼尔。把面罩摘了。" },
  ],
  [
    { id: 50, kind: "system", text: "城市上空落下银色细雨。每一块屏幕都在倒数。" },
    { id: 51, person: "ward", text: "我没有强迫任何人留下。我只把门打开。" },
    { id: 52, person: "harold", text: "门一旦永久打开，现实就没有选择了。" },
  ],
];

export const vlogReactionMessages: Message[] = [
  { id: 11, kind: "system", text: "片尾黑了。播放器的风扇还在转，屏幕上只剩一层雪花。档案室里没人先动：艾琳站在桌边，哈罗德看着窗外，米勒把冷咖啡放到旧卷宗旁。杯底渗出一圈水，正慢慢往纸页里走。" },
  { id: 12, person: "harold", text: "这东西，谁给你的？" },
  { id: 13, person: "erin", text: "下午进了我的旧案邮箱。没有正文，只有原片和一次性地址。地址现在已经失效了。" },
  { id: 14, person: "miller", text: "要是恶搞，他们比我们这栋楼有预算。那两套玩偶服都比我的防弹背心新。" },
  { id: 15, kind: "system", text: "哈罗德走到显示器前，没有碰键盘，只把后巷那两秒重看了一遍，停在玩偶服转身的地方。外间饮水机抽了一下水，随即安静。" },
  { id: 16, person: "harold", text: "原文件留下。明早送鉴证，今晚谁也别顺着一段视频跑出去。" },
  { id: 17, person: "erin", text: "玛雅失踪不到六小时。等鉴证上班，她可能已经不在原来的地方了。" },
  { id: 18, kind: "system", text: "米勒把纸杯挪开，免得它继续泡坏卷宗。他先看艾琳，再看哈罗德。没人离开；档案室的门半开着，走廊尽头的电子钟还在往三点走。" },
];
