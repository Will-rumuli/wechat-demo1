// 《我们群里少了一个人》第一案：今晚别上四楼

export const CASE = {
  id: 'case1',
  title: '今晚别上四楼',
  duration: '约 10 分钟',
  open: true,
  seed: 1,
  ratio: 0.82,
  synopsis: '雨夜，7 号楼的邻里群里，苏晴留下一句“今晚别上四楼”后退出了群聊。四楼没有人住，可今晚楼上一直有脚步声。四个邻居被困在群里，能相信的只有彼此发来的消息。',
  tags: ['雨夜失踪', '群聊叙事', '多结局'],
  group: '群聊 · 7 号楼邻里群',
  opening: ['苏晴 已退出群聊'],
  firstLine: { roleId: 'zhou', text: '今晚别上四楼。' }
};

export const COLORS = {
  night: '#0E1420',
  night2: '#151D2C',
  amber: '#F2C14E',
  red: '#C0392B',
  paper: '#F5F1E8',
  ink: '#1B1B1B',
  gray: '#8A93A3',
  green: '#7FB37F',
  blue: '#7FB3D5'
};

export const ROLES = [
  {
    id: 'zhou',
    name: '老周',
    job: '保安',
    color: COLORS.amber,
    icon: 'flashlight',
    tagline: '在这栋楼守了十一年',
    intro: '你认识楼里每一个人，也认识每一个不该来的人。今晚你做了一个决定，现在只希望没人问起。',
    secret: '21:10，你私自放苏晴的哥哥进楼，还撕掉了访客登记本那一页。',
    goal: '别让物业和大家知道是你放的人。',
    lie: '我一直守在门口，谁进来我都登记了。',
    privateClues: ['C01', 'C02', 'C08']
  },
  {
    id: 'lin',
    name: '林晚',
    job: '404 住户',
    color: COLORS.red,
    icon: 'umbrella',
    tagline: '住在苏晴楼下',
    intro: '你和苏晴算不上朋友，只是邻居。但你比谁都清楚，她最近在怕什么。',
    secret: '你向苏晴借过三万块，三天前还没还。20:47 你们吵了一架。',
    goal: '别让大家知道你和苏晴有过节，更别知道那笔钱。',
    lie: '我跟她不熟，平时都不怎么说话。',
    privateClues: ['C06', 'C07', 'C11']
  },
  {
    id: 'kai',
    name: '阿凯',
    job: '外卖员',
    color: COLORS.blue,
    icon: 'helmet',
    tagline: '今晚跑了十四单',
    intro: '你只想按时送完这一单。可 403 门口的盒子不太对劲，你还是把它拿走了。',
    secret: '你私拿了 403 门口的快递盒，盒底粘着一个还在闪的定位器。',
    goal: '保住这份工作，别被投诉偷东西。',
    lie: '我把外卖放门口就走了，什么都没拿。',
    privateClues: ['C04', 'C14', 'C15']
  },
  {
    id: 'chen',
    name: '陈姐',
    job: '保洁',
    color: COLORS.green,
    icon: 'cart',
    tagline: '在这栋楼干了六年',
    intro: '你每天最后一个走。今晚你看见了一些事，但你不敢说，说了可能连工作都没了。',
    secret: '你在 B1 收废品时，看见苏晴躲进了储藏室，还给她留了毯子和水。',
    goal: '别被开除，别被卷进这件事。',
    lie: 'B1 我早就锁了，没人进得去。',
    privateClues: ['C05', 'C09', 'C16']
  }
];

export const CLUES = {
  C01: {
    id: 'C01', act: 1, loc: 'guard', title: '访客登记本缺页',
    source: '门卫室', reliability: '确定',
    text: '登记本在 21:10 那一页被撕掉了，纸根上还留着半截字迹：“苏……哥……2 人”。',
    tag: '有人被放进了楼'
  },
  C02: {
    id: 'C02', act: 1, loc: 'guard', title: '座机通话记录',
    source: '门卫室', reliability: '确定',
    text: '21:08 有一通 42 秒的呼出，号码被圆珠笔反复涂黑，但能看出是本市的号段。',
    tag: '老周打过电话'
  },
  C03: {
    id: 'C03', act: 1, loc: 'door403', title: '垃圾袋里的碎车票',
    source: '403 门口', reliability: '确定',
    text: '撕碎的车票拼起来是两张 23:40 开往南方的 K 字头硬座，乘客姓名被剪掉了。',
    tag: '她准备离开'
  },
  C04: {
    id: 'C04', act: 1, loc: 'door403', title: '外卖小票',
    source: '403 门口', reliability: '确定',
    text: '21:05 下单，一份粥。备注只有七个字：“放门口，别敲门。”',
    tag: '她在试探门外有没有人'
  },
  C05: {
    id: 'C05', act: 1, loc: 'elevator', title: 'B1 按钮上的红漆',
    source: '电梯', reliability: '可疑',
    text: 'B1 按钮边缘有一小块新鲜红漆，像是有人匆忙擦过，指甲缝里留下的。',
    tag: '有人频繁去 B1'
  },
  C06: {
    id: 'C06', act: 1, loc: 'chat', title: '群聊：20:47 的那句话',
    source: '群聊记录', reliability: '确定',
    text: '林晚 @苏晴：“你会后悔的。” 之后苏晴再没在群里说过话。',
    tag: '看起来像威胁'
  },
  C07: {
    id: 'C07', act: 1, loc: 'chat', title: '群聊：21:03 撤回',
    source: '群聊记录', reliability: '可疑',
    text: '系统只留下一行：“苏晴 撤回了一条消息”。没有人看到她原本说了什么。',
    tag: '她当时还在线'
  },
  C08: {
    id: 'C08', act: 1, loc: 'chat', title: '群聊：21:10 的提醒',
    source: '群聊记录', reliability: '可疑',
    text: '老周在群里发：“今晚别上四楼。” 没有解释，也没有标点。',
    tag: '他知道会发生什么'
  },
  C09: {
    id: 'C09', act: 2, loc: 'garbage', title: '垃圾房里的红雨衣',
    source: '垃圾房', reliability: '确定',
    text: '雨衣还是湿的，口袋里有一张 B1 门禁卡的卡套，卡不见了。',
    tag: '穿雨衣的人去过 B1'
  },
  C10: {
    id: 'C10', act: 2, loc: 'rooftop', title: '天台上的旧手机',
    source: '天台', reliability: '确定',
    text: '苏晴的备用机，电量 3%。草稿箱里躺着一句没发出去的话：“如果我走了，别找我。”',
    tag: '她计划消失'
  },
  C11: {
    id: 'C11', act: 2, loc: 'room404', title: '抽屉里的借条',
    source: '404', reliability: '确定',
    text: '林晚向苏晴借款三万元，日期是三天前，还款日写着“下个月”。',
    tag: '她们之间有金钱关系'
  },
  C12: {
    id: 'C12', act: 2, loc: 'moments', title: '苏晴的朋友圈',
    source: '手机', reliability: '确定',
    text: '三天前一条仅自己可见：“这次是真的走了。别找我，也别报警。”',
    tag: '不是绑架'
  },
  C13: {
    id: 'C13', act: 2, loc: 'garage', title: '没熄火的车',
    source: '地下车库', reliability: '确定',
    text: '一辆外地牌照的车，引擎盖还是温的，副驾上放着一件女式外套，尺码和苏晴相符。',
    tag: '有人要接她走'
  },
  C14: {
    id: 'C14', act: 2, loc: 'garage', title: '监控里的陌生男人',
    source: '地下车库', reliability: '误导',
    text: '21:40 一个戴口罩的男人在车库停了十分钟。后来证实，他是楼上 602 的住户。',
    tag: '看起来像跟踪者'
  },
  C15: {
    id: 'C15', act: 2, loc: 'box', title: '外卖箱里的快递盒',
    source: '外卖箱', reliability: '确定',
    text: '盒底粘着一个磁吸定位器，指示灯还在一闪一闪。收件人写的是苏晴。',
    tag: '有人在定位她'
  },
  C16: {
    id: 'C16', act: 2, loc: 'notice', title: '停电检修公告',
    source: '公告栏', reliability: '确定',
    text: '22:00—22:02 全楼停电检修。这两分钟里，所有监控都没有画面。',
    tag: '监控有 40 秒空白'
  },
  C17: {
    id: 'C17', act: 3, loc: 'b1', title: '储藏室里的生活痕迹',
    source: 'B1 储藏室', reliability: '确定',
    text: '一条叠好的毯子、两瓶水、一个充电宝。有人在这里待了至少一晚，而且刚离开不久。',
    tag: '她藏在楼里'
  },
  C18: {
    id: 'C18', act: 3, loc: 'b1', title: '两张去南方的车票',
    source: 'B1 储藏室', reliability: '确定',
    text: '23:40 的 K 字头，两张。一张写着苏晴，另一张写着“苏建军”——她哥哥。',
    tag: '她不是一个人走'
  },
  C19: {
    id: 'C19', act: 3, loc: 'cctv', title: '22:18 的红雨衣',
    source: '电梯监控', reliability: '确定',
    text: '红雨衣走进电梯，抬手按了 B1。监控里能看到她左手腕上的细链——是苏晴。',
    tag: '她自己下的楼'
  },
  C20: {
    id: 'C20', act: 3, loc: 'property', title: '访客申请：苏晴的哥哥',
    source: '物业系统', reliability: '确定',
    text: '21:09 提交访客申请，关系一栏写着“兄妹”，审批状态：门卫手动放行。',
    tag: '21:10 进来的是她哥哥'
  }
};

export const LOCATIONS = {
  guard: { id: 'guard', name: '门卫室', sub: '登记本 · 座机', icon: 'door' },
  door403: { id: 'door403', name: '403 门口', sub: '垃圾袋 · 外卖', icon: 'door' },
  elevator: { id: 'elevator', name: '电梯', sub: '按钮 · 监控盲区', icon: 'lift' },
  chat: { id: 'chat', name: '群聊记录', sub: '谁说了什么', icon: 'chat' },
  garbage: { id: 'garbage', name: '垃圾房', sub: '湿透的雨衣', icon: 'trash' },
  rooftop: { id: 'rooftop', name: '天台', sub: '水塔 · 旧手机', icon: 'roof' },
  room404: { id: 'room404', name: '404', sub: '林晚的房间', icon: 'door' },
  garage: { id: 'garage', name: '地下车库', sub: '没熄火的车', icon: 'car' },
  box: { id: 'box', name: '外卖箱', sub: '阿凯的车', icon: 'box' },
  notice: { id: 'notice', name: '公告栏', sub: '停电通知', icon: 'paper' },
  moments: { id: 'moments', name: '苏晴朋友圈', sub: '三天前', icon: 'phone' },
  b1: { id: 'b1', name: 'B1 储藏室', sub: '最下面那层', icon: 'storage' },
  cctv: { id: 'cctv', name: '电梯监控', sub: '22:18', icon: 'camera' },
  property: { id: 'property', name: '物业系统', sub: '访客记录', icon: 'screen' }
};

export const ACTS = [
  {
    id: 1,
    title: '第一幕 · 她退群了',
    time: '19:00 — 20:30',
    start: 19 * 60,
    step: 30,
    hint: '先弄清楚：今晚到底有谁进过这栋楼。',
    rounds: 3,
    locations: ['guard', 'door403', 'elevator', 'chat'],
    event: {
      title: '苏晴 撤回了一条消息',
      text: '21:03，群里跳出一行灰字。你只看到半句预览——“别报警”。'
    }
  },
  {
    id: 2,
    title: '第二幕 · 每个人都有秘密',
    time: '20:30 — 22:00',
    start: 20 * 60 + 30,
    step: 30,
    hint: '每个人都在自保。注意他们主动说了什么，也注意他们没说什么。',
    rounds: 3,
    locations: ['garbage', 'rooftop', 'room404', 'garage', 'box', 'notice', 'moments'],
    event: {
      title: '全楼停电 40 秒',
      text: '22:00，灯全灭了。黑暗里有人开了门，又轻轻关上。监控什么都没拍到。'
    }
  },
  {
    id: 3,
    title: '第三幕 · 最后一班电梯',
    time: '22:00 — 23:10',
    start: 22 * 60,
    step: 35,
    hint: '23:40 的火车不会等人。她还在楼里吗？',
    rounds: 2,
    locations: ['b1', 'cctv', 'property'],
    event: {
      title: '电梯在 B1 异常停留',
      text: '电梯在 B1 停了很久，然后自己回到一楼。门开了，里面没有人。'
    }
  }
];

export const TRUTH = [
  '苏晴没有被绑架。她被前男友长期跟踪，决定今晚离开这座城市。',
  '21:10 来的是她哥哥苏建军。老周认出了他，私自放行，并撕掉了登记页。',
  '21:05 的外卖是苏晴自己点的，用来试探门外有没有人。阿凯顺手拿走了门口的快递盒，盒底是前男友放的定位器。',
  '22:18 穿红雨衣进电梯的人就是苏晴。她去了 B1 储藏室，在那里等到最后一班车的时间。',
  '林晚那句“你会后悔的”，不是威胁，是警告她别一个人走。'
];

export const ENDINGS = {
  help: {
    id: 'help',
    title: '好结局 · 她发来一条来自陌生城市的消息',
    mood: '温暖',
    text: '你们决定帮她。23:40，两个人拎着一只旧行李箱上了车。三天后，群里多了一条陌生号码发来的消息：“到了。谢谢你们没问。”然后她退出了群。',
    footer: '你们选择了帮她。群还在，人也还在。'
  },
  help_fail: {
    id: 'help_fail',
    title: '坏结局 · 最后一班车开走了',
    mood: '无力',
    text: '你们决定帮她，却没有人想到 B1。23:40，最后一班车从楼下开走，车厢里没有她。第二天早上，陈姐在储藏室的毯子下面发现了她——她一直在等，等到灯灭。',
    footer: '你们选择了帮她，却没能在最后一班车之前找到她。'
  },
  police: {
    id: 'police',
    title: '中性结局 · 她安全了，但再也没回群',
    mood: '正确但疏离',
    text: '警察来了，做了笔录，确认她安全。第二天，403 换了锁，群名改回了原来的名字。没有人再提起苏晴，就像她从来没有住过。',
    footer: '你们选择了报警。她安全了，但没有回来。'
  },
  police_fail: {
    id: 'police_fail',
    title: '灰结局 · 笔录上没有她的名字',
    mood: '悬而未决',
    text: '你们报了警，却指错了方向。警察搜遍了天台和车库，笔录上只写着“暂未发现失踪人员”。三天后，403 的门从里面反锁着，钥匙插在锁孔里，人不见了。',
    footer: '你们选择了报警，但没有人知道她在哪。'
  },
  property: {
    id: 'property',
    title: '坏结局 · 群里只剩沉默',
    mood: '后悔',
    text: '物业通知了前男友，说“住户已经离开”。23:40，你们在群里等到天亮，没有等到那条“到了”。后来群里少了一个人，也没有人再问起。',
    footer: '你们选择了通知物业。有人今晚会消失。'
  },
  hidden: {
    id: 'hidden',
    title: '隐藏结局 · 最后一班电梯',
    mood: '释然',
    text: '你们在 B1 找到她，把她的秘密和你们的秘密一起摊在灯下。没有报警，没有通知物业。你们一人拎一个箱子，把她送到楼下。她说：“群里没有少人，我只是换了个群。”',
    footer: '你们在 B1 找到了她。'
  }
};

// 每局随机抽一位角色作为“关键说谎者”，真相里追加对应段落
export const LIE_NOTE = {
  zhou: '这一局最关键的一句谎，来自老周。21:10 他放进来的人本该第一时间被所有人知道——那是苏晴的哥哥，也是唯一知道她要走的人。',
  lin: '这一局最关键的一句谎，来自林晚。她隐瞒的不只是那三万块，还有 20:47 那场争吵里苏晴亲口说过的话：“今晚有人来接我。”',
  kai: '这一局最关键的一句谎，来自阿凯。他拿走的不只是一个快递盒，盒底那枚还在闪的定位器，正是前男友找到她的路标。',
  chen: '这一局最关键的一句谎，来自陈姐。她今晚见过苏晴，却把那扇门说成“早就锁了”，让所有人多绕了整整两个小时。'
};

// AI 群聊台词：按幕递增紧张感，避免重复观感
export const CHAT_LINES = {
  1: [
    '你们谁最后见到她？',
    '我 20:40 还看见 403 亮着灯。',
    '她最近是不是得罪什么人了。',
    '别瞎猜，先看看楼里有没有外人。',
    '我手机快没电了，谁带充电宝了。',
    '说真的，我有点不敢上楼。'
  ],
  2: [
    '我刚才好像听见 B1 有声音。',
    '停电那会儿你在哪？',
    '别绕了，先说自己都干了什么。',
    '你们不觉得奇怪吗，她退群退得太干脆了。',
    '我什么都没看见，别问我。',
    '如果她只是自己走了呢？'
  ],
  3: [
    '23:40 的车，现在还剩多久？',
    '电梯又停在 B1 了。',
    '我们是不是应该报警。',
    '再找不到，就来不及了。',
    '你们有没有想过，她可能不想被找到。',
    '最后问一次，谁还有没说的事。'
  ]
};

export const LIAR_LINES = {
  zhou: ['我一直守在门口。', '登记本？我哪记得那么细。', '今晚没人进来，我确定。'],
  lin: ['我跟她不熟。', '我借钱？你听谁说的。', '那句话说出口我就后悔了。'],
  kai: ['我送完就走了。', '外卖箱里能有什么。', '我就是个送外卖的，别盯着我。'],
  chen: ['B1 我早就锁了。', '我什么都不知道。', '我还要上班，别为难我。']
};

export const FILLER = {
  title: '没有新的发现',
  text: '你在原地站了一会儿，只听见雨声。这里已经没有更多东西了。',
  source: '现场',
  reliability: '—'
};

export const ROLE_MAP = ROLES.reduce((map, role) => {
  map[role.id] = role;
  return map;
}, {});

export const CLUE_LIST = Object.keys(CLUES).map((id) => CLUES[id]);

export const QUESTIONS = [
  {
    id: 'q1',
    q: '苏晴现在最可能在哪里？',
    hint: '想想她今晚所有的移动轨迹。',
    answer: 'b1',
    options: [
      { id: 'b1', label: 'B1 储藏室' },
      { id: 'rooftop', label: '天台' },
      { id: 'garage', label: '地下车库' },
      { id: 'room403', label: '403 房间' }
    ]
  },
  {
    id: 'q2',
    q: '今晚谁最可能在说谎？',
    hint: '每个人都在隐瞒，但只有一件事最耽误找到她。',
    answer: 'zhou',
    options: ROLES.map((role) => ({ id: role.id, label: `${role.name} · ${role.job}` }))
  },
  {
    id: 'q3',
    q: '你们决定怎么做？',
    hint: '这是唯一一个没有标准答案的问题。',
    answer: 'help',
    options: [
      { id: 'help', label: '帮她离开' },
      { id: 'police', label: '报警' },
      { id: 'property', label: '通知物业' }
    ]
  }
];

export const HIDDEN = {
  q3: 'help',
  requireQ1: true,
  requireQ2: false,
  clues: ['C17', 'C18']
};

const B1_DECOY = {
  C17: {
    reliability: '误导',
    title: 'B1 的旧毯子',
    text: '一条叠好的毯子、两瓶水。水是三天前的，毯子上落了薄灰。有人在这里躲过，但不是今晚。',
    tag: '看起来像藏身处'
  },
  C18: {
    reliability: '误导',
    title: '被泡烂的旧车票',
    text: '两张去年的废票，边角被雨水泡烂。有人故意把它们摆在这里，像是想让你们以为她走了。',
    tag: '有人布置过现场'
  }
};

// 每局随机一个藏身点：线索指向、真相段落、结局文案都会跟着变
export const SPOTS = [
  {
    id: 'b1',
    name: 'B1 储藏室',
    hiddenClues: ['C17', 'C18']
  },
  {
    id: 'rooftop',
    name: '天台水塔后',
    patches: {
      C05: {
        title: '顶楼按钮上的红漆',
        text: '顶楼按钮边缘有一小块新鲜红漆，像是有人匆忙擦过，指甲缝里留下的。',
        tag: '有人频繁上天台'
      },
      C09: {
        text: '雨衣还是湿的，口袋里有一张天台门禁卡的卡套，卡不见了。',
        tag: '穿雨衣的人上过天台'
      },
      C19: {
        text: '红雨衣走进电梯，抬手按了顶楼。监控里能看到她左手腕上的细链——是苏晴。',
        tag: '她自己上了天台'
      },
      ...B1_DECOY
    },
    roles: {
      chen: {
        secret: '你在半夜收垃圾时，看见苏晴抱着毯子上了天台。你给她留了一瓶水，也留了那扇门。',
        lie: '天台的门我锁了，没人上得去。'
      }
    },
    liarLines: {
      chen: ['天台的门我锁了。', '我什么都不知道。', '我还要上班，别为难我。']
    },
    extra: [{
      id: 'S1R', act: 2, loc: 'rooftop', title: '水塔后的防水布',
      source: '天台', reliability: '确定',
      text: '防水布下压着一条毯子、两个空水瓶、一个充电宝，还有一张 23:40 的 K 字头车票。这个位置刚好躲开楼道的灯。',
      tag: '她一直躲在楼顶'
    }],
    truthPatch: {
      3: '22:18 穿红雨衣进电梯的人就是苏晴。她没有下楼，而是上了天台，在水塔后面等到最后一班车的时间。'
    },
    endings: {
      help_fail: {
        text: '你们决定帮她，却没有人想到天台。23:40，最后一班车从楼下开走，车厢里没有她。第二天早上，陈姐在天台水塔后面发现了她——她一直在等，等到灯灭。'
      },
      police_fail: {
        text: '你们报了警，却指错了方向。警察搜遍了储藏室和车库，笔录上只写着“暂未发现失踪人员”。三天后，403 的门从里面反锁着，钥匙插在锁孔里，人不见了。'
      },
      hidden: {
        text: '你们在天台找到她，把她的秘密和你们的秘密一起摊在灯下。没有报警，没有通知物业。你们一人拎一个箱子，把她送到楼下。她说：“群里没有少人，我只是换了个群。”',
        footer: '你们在天台找到了她。'
      }
    },
    hiddenClues: ['S1R']
  },
  {
    id: 'room403',
    name: '403 她自己的房间',
    patches: {
      C19: {
        text: '红雨衣在 4 楼走出电梯，走廊监控拍到她掏钥匙开门——她回的是自己家。',
        tag: '她回了 403'
      },
      ...B1_DECOY
    },
    roles: {
      chen: {
        secret: '22:19 你在四楼拖地，看见苏晴刷卡回了 403，之后再没出来。你没有声张。',
        lie: '403 我敲过门，里面没人。'
      }
    },
    liarLines: {
      chen: ['403 我敲过门，里面没人。', '我什么都不知道。', '我还要上班，别为难我。']
    },
    extra: [{
      id: 'S1A', act: 3, loc: 'property', title: '403 的门禁记录',
      source: '物业系统', reliability: '确定',
      text: '22:19 刷卡进入 403，之后没有任何外出记录。电梯监控也没有再拍到她。',
      tag: '她根本没出这栋楼'
    }],
    truthPatch: {
      3: '22:18 穿红雨衣进电梯的人就是苏晴。她没有下楼，也没有去天台——她回了 403，反锁门，关了灯。'
    },
    endings: {
      help_fail: {
        text: '你们决定帮她，却没有人想到 403。23:40，最后一班车从楼下开走，车厢里没有她。第二天早上，林晚用备用钥匙打开 403 的门，看见她坐在没开灯的客厅里——她一直在等，等到灯灭。'
      },
      hidden: {
        text: '你们在 403 找到她，把她的秘密和你们的秘密一起摊在灯下。没有报警，没有通知物业。你们一人拎一个箱子，把她送到楼下。她说：“群里没有少人，我只是换了个群。”',
        footer: '你们在 403 找到了她。'
      }
    },
    hiddenClues: ['S1A']
  }
];

// 线索会威胁到谁的秘密
export const EXPOSES = {
  C01: ['zhou'], C02: ['zhou'], C08: ['zhou'], C20: ['zhou'],
  C06: ['lin'], C07: ['lin'], C11: ['lin'],
  C04: ['kai'], C14: ['kai'], C15: ['kai'],
  C05: ['chen'], C09: ['chen'], C16: ['chen'], C17: ['chen']
};
