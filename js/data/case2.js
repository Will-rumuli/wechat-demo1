// 《我们群里少了一个人》第二案：群里多了一个“人”？

export const CASE = {
  id: 'case2',
  title: '群里多了一个“人”？',
  duration: '约 35 分钟',
  open: true,
  seed: 2,
  ratio: 1.02,
  synopsis: '一个已经注销三年的账号，突然在群里说话了。704 的老人三年前就已下葬，可他的头像今晚亮着。当群里多出第五个人，你们要查清楚：是谁回来了，又是谁不想让他回来。',
  tags: ['账号还魂', '密室暗间', '隐藏结局'],
  group: '群聊 · 7 号楼邻里群',
  opening: ['“704 许国平”加入了群聊'],
  firstLine: { roleId: 'laozhou', text: '谁把 704 的号拉回来的？' }
};

const COLORS = {
  amber: '#F2C14E',
  red: '#C0392B',
  paper: '#F5F1E8',
  gray: '#8A93A3',
  green: '#7FB37F',
  blue: '#7FB3D5'
};

export const ROLES = [
  {
    id: 'laozhou',
    name: '老周',
    job: '保安',
    color: COLORS.amber,
    icon: 'flashlight',
    tagline: '在这栋楼守了十一年',
    intro: '你见过这栋楼所有的深夜。三年前那晚，你收了一个信封，也把一辆担架推出了后门。',
    secret: '三年前你帮许巍把一口空担架从后门运走，收了两万块；704 的备用钥匙其实一直在你手里。',
    goal: '别让人知道三年前那晚你做过什么。',
    lie: '704 三年没人住了，我连门都没开过。',
    privateClues: ['C205', 'C208', 'C230']
  },
  {
    id: 'chenjie',
    name: '陈姐',
    job: '保洁',
    color: COLORS.green,
    icon: 'cart',
    tagline: '在这栋楼干了六年',
    intro: '你每天最后一个走。704 的饭是你送的，B1 的门是你锁的。',
    secret: '你每月收许巍 2000 元，给 704 送饭；周宁求你帮忙藏人时，你也答应了。',
    goal: '保住工作，别被当成同谋。',
    lie: 'B1 储藏室我上周就锁了，没人进得去。',
    privateClues: ['C209', 'C220', 'C229']
  },
  {
    id: 'shenmo',
    name: '沈默',
    job: '网络维护',
    color: COLORS.blue,
    icon: 'screen',
    tagline: '管着全楼的门禁和监控',
    intro: '门禁、监控、群管理，你都有钥匙。今晚有人找你删了一段东西，你没有多问。',
    secret: '你帮许棠恢复了老许的账号，又帮许巍删掉 03:00 的监控；平时还在偷卖住户门禁数据。',
    goal: '别让警察查到监控是你删的。',
    lie: '监控是设备老化，自动覆盖了。',
    privateClues: ['C201', 'C214', 'C221']
  },
  {
    id: 'xutang',
    name: '许棠',
    job: '704 亲属',
    color: COLORS.red,
    icon: 'umbrella',
    tagline: '三年没回这栋楼',
    intro: '你退掉了三年前的机票，也退掉了原本的人生。今晚，你用爷爷的旧手机重新进了群。',
    secret: '你是许国平的孙女。三年前你退掉机票回楼调查，也是你把爷爷的账号拉回了群。',
    goal: '找到爷爷还活着的证据，让许巍付出代价。',
    lie: '我只是回来处理爷爷的遗物。',
    privateClues: ['C210', 'C213', 'C228']
  }
];

export const CLUES = {
  C201: {
    id: 'C201', act: 1, loc: 'chat', title: '群成员变更记录',
    source: '群聊记录', reliability: '确定',
    text: '19:06，一个叫“shenmo”的管理账号把“704 许国平”重新拉进群。操作记录只保留了七秒。',
    tag: '有人恢复了死人的账号'
  },
  C202: {
    id: 'C202', act: 1, loc: 'notice', title: '三年前的讣告',
    source: '公告栏', reliability: '确定',
    text: '许国平，704 住户，三年前因心源性猝死去世。讣告发布人是儿子许巍。',
    tag: '704 确实死过人'
  },
  C203: {
    id: 'C203', act: 1, loc: 'door704', title: '704 门口的外卖',
    source: '704 门口', reliability: '确定',
    text: '两盒还温着的粥，订单备注只有五个字：“给爸，别敲门。”',
    tag: '704 里有人吃饭'
  },
  C204: {
    id: 'C204', act: 1, loc: 'chat', title: '老许的最后一条语音',
    source: '群聊记录', reliability: '可疑',
    text: '三年前的语音被重新转发进群，只有 4 秒：“我还在 704。”背景里有电梯报层声：“B1。”',
    tag: '死人开口了'
  },
  C205: {
    id: 'C205', act: 1, loc: 'guard', title: '访客登记',
    source: '门卫室', reliability: '可疑',
    text: '19:10，一个叫许棠的女人以“亲属”身份进楼。字迹很急，关系一栏写的是“孙女”。',
    tag: '有人在说谎'
  },
  C206: {
    id: 'C206', act: 1, loc: 'notice', title: '停电通知',
    source: '公告栏', reliability: '误导',
    text: '明天上午全楼检修。有人立刻说：“那今晚监控黑了也正常。”',
    tag: '提前找好借口'
  },
  C207: {
    id: 'C207', act: 2, loc: 'meter', title: '电表读数',
    source: '电表间', reliability: '确定',
    text: '704 本月用电 41 度，最近一次跳表是今天 21:07。空置三年的房子不会自己用电。',
    tag: '空屋有人住'
  },
  C208: {
    id: 'C208', act: 2, loc: 'guard', title: '备用钥匙',
    source: '门卫室', reliability: '确定',
    text: '钥匙板上少了一把 704 的钥匙。老周说三年前就丢了，可挂钩上的灰是新的。',
    tag: '有人能进 704'
  },
  C209: {
    id: 'C209', act: 2, loc: 'garbage', title: '社区医院保温袋',
    source: '垃圾房', reliability: '确定',
    text: '垃圾房里的保温袋印着社区医院，里面有两双一次性筷子。送饭的人不是一个人。',
    tag: '704 有两个人'
  },
  C210: {
    id: 'C210', act: 2, loc: 'room704', title: '死亡证明复印件',
    source: '704 室内', reliability: '可疑',
    text: '死亡原因写着“心源性猝死”，签字医生在系统里查无此人。纸张却很新。',
    tag: '死亡可能是假的'
  },
  C211: {
    id: 'C211', act: 2, loc: 'property', title: '许巍的旧工牌',
    source: '物业办公室', reliability: '可疑',
    text: '许巍三年前从物业离职，工牌却一直能刷开电梯机房和 B1。',
    tag: '离职的人还有权限'
  },
  C212: {
    id: 'C212', act: 5, loc: 'rooftop', title: '放下的消防梯',
    source: '天台', reliability: '确定',
    text: '天台水箱后的消防梯被人放了下来，末端系着一条打结的床单。有人打算从楼外把老人带下去。',
    tag: '她准备好了退路'
  },
  C213: {
    id: 'C213', act: 3, loc: 'chat', title: '03:00 的走廊照片',
    source: '群聊记录', reliability: '确定',
    text: '704 门口站着一个穿物业工装的人，脸被闪光灯吞掉。发送时间 03:00:07。',
    tag: '有人在 704 门口'
  },
  C214: {
    id: 'C214', act: 3, loc: 'cctv', title: '监控删除记录',
    source: '监控室', reliability: '确定',
    text: '02:57 到 03:04 的监控被本地删除，操作账号是“shenmo”，不是系统自动覆盖。',
    tag: '监控被人为删除'
  },
  C215: {
    id: 'C215', act: 3, loc: 'elevator', title: '周宁的工牌',
    source: '电梯', reliability: '确定',
    text: '工牌卡在电梯缝里，挂绳被扯断。背面贴着一张便签：“704，别敲门。”',
    tag: '她去过 704'
  },
  C216: {
    id: 'C216', act: 3, loc: 'room1201', title: '1201 未发出的短信',
    source: '1201', reliability: '确定',
    text: '草稿箱里只有一句：“704 里有人，他还活着，我今晚带他走。”收件人是 110。',
    tag: '她发现了一个活人'
  },
  C217: {
    id: 'C217', act: 3, loc: 'garbage', title: '男款红雨衣',
    source: '垃圾房', reliability: '误导',
    text: '垃圾房多了件湿透的红雨衣，尺码是男款。有人立刻想起第一案里的红雨衣。',
    tag: '看起来像旧人回来'
  },
  C218: {
    id: 'C218', act: 3, loc: 'elevator', title: '电梯报层录音',
    source: '电梯', reliability: '可疑',
    text: '02:58，电梯在 7 楼停了一次，门开了 11 秒又关上。没有人按过 7 楼。',
    tag: '有人被带上电梯'
  },
  C219: {
    id: 'C219', act: 4, loc: 'storage', title: 'B1 三长两短',
    source: 'B1 储藏室', reliability: '确定',
    text: '敲击声从管道里传来，三长两短，停十秒，再重复。是周宁和老许约定的求救信号。',
    tag: '有人在求救'
  },
  C220: {
    id: 'C220', act: 4, loc: 'storage', title: '储藏室的新锁',
    source: 'B1 储藏室', reliability: '确定',
    text: '锁是从外面扣上的，门缝里有一圈干掉的粥渍。里面的人被关过至少两个小时。',
    tag: '有人被关过'
  },
  C221: {
    id: 'C221', act: 4, loc: 'machine', title: '机房刷卡的旧工牌',
    source: '电梯机房', reliability: '确定',
    text: '03:01，许巍的旧工牌刷开了电梯机房。门禁记录只留了一条，像是故意没删干净。',
    tag: '许巍来过机房'
  },
  C222: {
    id: 'C222', act: 4, loc: 'machine', title: '空了的降压药',
    source: '电梯机房', reliability: '确定',
    text: '药盒上写着许国平的名字，最后一粒是两天前吃的。他被藏在这里，不是今天才开始。',
    tag: '老人还活着'
  },
  C223: {
    id: 'C223', act: 4, loc: 'property', title: '许巍的辞职信',
    source: '物业办公室', reliability: '可疑',
    text: '辞职理由写“照顾父亲”，日期却比讣告早一天。他早就知道父亲会“死”。',
    tag: '他提前安排了一切'
  },
  C224: {
    id: 'C224', act: 4, loc: 'chat', title: '物业辟谣通知',
    source: '群聊记录', reliability: '误导',
    text: '物业在群里发：“704 无人居住，请勿传播谣言。”配图是一张崭新的封条。',
    tag: '官方让你别查'
  },
  C225: {
    id: 'C225', act: 5, loc: 'machine', title: '机房里的录音笔',
    source: '电梯机房', reliability: '确定',
    text: '周宁留下的录音笔。许巍的声音很清楚：“我爸没死，但房产证是我的。你再管，就别想出去。”',
    tag: '他承认了'
  },
  C226: {
    id: 'C226', act: 5, loc: 'room704', title: '704 的暗间',
    source: '704 室内', reliability: '确定',
    text: '衣柜后面有一道 1.8 米高的暗门，里面有床、尿袋和一台旧电视。床边放着一双男式拖鞋。',
    tag: '老人被藏在这里'
  },
  C227: {
    id: 'C227', act: 5, loc: 'room704', title: '老许的手写纸条',
    source: '704 室内', reliability: '确定',
    text: '纸条压在枕头下：“小周，别管我，他会回来。你走。”字迹抖得厉害。',
    tag: '老人在保护她'
  },
  C228: {
    id: 'C228', act: 5, loc: 'room704', title: '许棠的退票记录',
    source: '704 室内', reliability: '可疑',
    text: '三年前的机票退票记录，目的地是国外。退票时间比讣告早三天。她没有走。',
    tag: '她一直在查'
  },
  C229: {
    id: 'C229', act: 5, loc: 'storage', title: '陈姐的收款记录',
    source: 'B1 储藏室', reliability: '确定',
    text: '每月 15 号，许巍转给陈姐 2000 元，备注“清洁费”。最近一笔是昨天。',
    tag: '送饭的人收钱'
  },
  C230: {
    id: 'C230', act: 5, loc: 'garage', title: '后门的运尸推车',
    source: '地下车库', reliability: '可疑',
    text: '三年前的监控里，老周推着一辆盖白布的担架从后门出去。担架很轻，轮子几乎没有压痕。',
    tag: '三年前运走的不是尸体'
  }
};

export const LOCATIONS = {
  guard: { id: 'guard', name: '门卫室', sub: '登记本 · 钥匙板', icon: 'door' },
  door704: { id: 'door704', name: '704 门口', sub: '外卖 · 封条', icon: 'door' },
  chat: { id: 'chat', name: '群聊记录', sub: '谁还在说话', icon: 'chat' },
  notice: { id: 'notice', name: '公告栏', sub: '讣告 · 通知', icon: 'paper' },
  meter: { id: 'meter', name: '电表间', sub: '704 的电表', icon: 'screen' },
  room704: { id: 'room704', name: '704 室内', sub: '空置三年', icon: 'door' },
  garbage: { id: 'garbage', name: '垃圾房', sub: '保温袋 · 雨衣', icon: 'trash' },
  property: { id: 'property', name: '物业办公室', sub: '旧工牌 · 档案', icon: 'screen' },
  elevator: { id: 'elevator', name: '电梯', sub: '03:00 的停留', icon: 'lift' },
  cctv: { id: 'cctv', name: '监控室', sub: '被删的七分钟', icon: 'camera' },
  room1201: { id: 'room1201', name: '1201', sub: '周宁的房间', icon: 'door' },
  storage: { id: 'storage', name: 'B1 储藏室', sub: '新锁 · 敲击声', icon: 'storage' },
  machine: { id: 'machine', name: '电梯机房', sub: '最底层', icon: 'storage' },
  garage: { id: 'garage', name: '地下车库', sub: '后门 · 担架', icon: 'car' },
  rooftop: { id: 'rooftop', name: '天台', sub: '旧水箱', icon: 'roof' }
};

export const ACTS = [
  {
    id: 1,
    title: '第一幕 · 死人上线',
    time: '19:00 — 21:00',
    start: 19 * 60,
    step: 30,
    hint: '先弄清楚：这个账号是谁拉回群的。',
    rounds: 3,
    locations: ['guard', 'door704', 'chat', 'notice'],
    event: {
      title: '“我还在 704。”',
      text: '21:00，群里所有人同时收到一条四秒语音。声音是三年前的许国平，背景里有电梯报层声。'
    }
  },
  {
    id: 2,
    title: '第二幕 · 空屋有灯',
    time: '21:00 — 01:00',
    start: 21 * 60,
    step: 60,
    hint: '704 空置了三年，可有些东西一直在运转。',
    rounds: 3,
    locations: ['meter', 'room704', 'garbage', 'property', 'guard'],
    event: {
      title: '电表自己跳了 3 度',
      text: '01:00，704 的电表在无人刷卡的情况下跳了 3 度。门内传来一声很轻的椅子响。'
    }
  },
  {
    id: 3,
    title: '第三幕 · 03:00 的走廊',
    time: '01:00 — 03:00',
    start: 25 * 60,
    step: 60,
    hint: '周宁最后出现的地方，不是她的房间。',
    rounds: 3,
    locations: ['elevator', 'cctv', 'room1201', 'chat', 'garbage'],
    event: {
      title: '门禁失效的七分钟',
      text: '03:00，全楼门禁失效七分钟。群里出现一张 704 门口的照片，照片里站着一个穿物业工装的人。'
    }
  },
  {
    id: 4,
    title: '第四幕 · B1 没有信号',
    time: '03:00 — 04:00',
    start: 27 * 60,
    step: 20,
    hint: '敲击声不会说谎，但会被人忽略。',
    rounds: 3,
    locations: ['storage', 'machine', 'property', 'chat'],
    event: {
      title: '三长两短',
      text: '04:00，B1 的管道里传来三长两短的敲击。停十秒，又响一次。电梯停在 B1 不动了。'
    }
  },
  {
    id: 5,
    title: '第五幕 · 天亮之前',
    time: '04:00 — 05:10',
    start: 28 * 60,
    step: 20,
    hint: '第一班垃圾车进院之前，你们必须做出选择。',
    rounds: 3,
    locations: ['room704', 'machine', 'storage', 'garage', 'rooftop'],
    event: {
      title: '垃圾车进院了',
      text: '05:10，第一班垃圾车开进院子。有人推着一辆盖白布的推车，从 B1 慢慢出来。'
    }
  }
];

export const TRUTH = [
  '群里多出来的“许国平”，就是三年前被宣告死亡的 704 老人。他没有死，被儿子许巍藏在 704 衣柜后的暗间里。',
  '三年前许巍伪造死亡证明、注销户口，为的是继续领父亲的退休金、保住 704 的产权。老周帮他运走空担架，陈姐每天送饭，沈默帮他删监控、恢复账号。',
  '许棠是老许的孙女。她退掉机票回楼，用爷爷的旧手机把账号拉回群，想逼许巍露出破绽。',
  '周宁在给老许送药时发现了暗间，决定天亮前带他走。她用老许的手机在群里发“别开门，他在楼道里”，警告的是许巍，不是鬼。',
  '许巍在 B1 追上他们，把周宁关进电梯机房，又把老许转移回 704。B1 的三长两短，是周宁敲管道发出的求救。',
  '你们在天亮前找到了机房和暗间。老许还活着，周宁也还活着，剩下的只是选择。'
];

export const ENDINGS = {
  help: {
    id: 'help',
    title: '好结局 · 天亮之后的第一条消息',
    mood: '释然',
    text: '你们先救了人。老许被背下楼时一直抓着周宁的袖子，许巍在车库被拦下。第二天，群里多了一条消息：“我回来了。”发消息的人，是三年来第一次真正上线的许国平。',
    footer: '你们选择了先救人。天快亮了，楼道里第一次有人敲门。'
  },
  help_fail: {
    id: 'help_fail',
    title: '坏结局 · 白布推车',
    mood: '窒息',
    text: '你们决定先救人，却没有找到机房。05:10，垃圾车开进院子，有人推着一辆盖着白布的推车从 B1 慢慢出来。你们追上去时，推车已经空了，电梯停在 704，门开着，里面没有人。',
    footer: '你们选择了先救人，却没能在垃圾车进院之前找到他们。'
  },
  police: {
    id: 'police',
    title: '中性结局 · 704 的封条',
    mood: '正确但沉重',
    text: '警察赶到，许巍被捕。老许因为延误治疗再也说不出完整的话，周宁辞了职，搬离了 7 号楼。704 的门上换了新的封条，群还在，但没有人再提那晚。',
    footer: '你们选择了报警。她安全了，但群里再也没有人说起 704。'
  },
  police_fail: {
    id: 'police_fail',
    title: '灰结局 · 查无此人',
    mood: '悬而未决',
    text: '你们报了警，却指错了楼层。警察走遍了 704 和天台，什么都没找到。天亮后，封条重新贴好，周宁的工牌还挂在电梯里，人却再也没有出现过。',
    footer: '你们选择了报警，但没有人知道他们在哪。'
  },
  property: {
    id: 'property',
    title: '坏结局 · 物业说没有这个人',
    mood: '后悔',
    text: '物业先一步得到消息，销毁了门禁和监控记录。许巍连夜把老许转移走，704 被重新贴上封条。第二天，物业在群里说：“704 无人居住，请勿传播谣言。”',
    footer: '你们选择了通知物业。有人今晚会被送走。'
  },
  silence: {
    id: 'silence',
    title: '沉默结局 · 群里再没人提过',
    mood: '冷',
    text: '你们删掉了群记录，也删掉了彼此的问号。天亮后，垃圾车照常进院，704 的门没有再开过。一个月后，群名改了，没有人再提许国平，也没有人再提周宁。',
    footer: '你们选择了保持沉默。天亮以后，704 重新贴上了封条。'
  },
  hidden: {
    id: 'hidden',
    title: '隐藏结局 · 我回来了',
    mood: '温暖',
    text: '你们在警察到之前把老许背下楼，录音笔和暗间照片同时发进群里。许棠公开了全部证据，整栋楼第一次没有一个人退群。许巍在车库被拦下时，老许用孙女的手机发了三个字：“我回来了。”',
    footer: '你们在警察到之前把老许背下了楼。'
  }
};

// 每局随机抽一位角色作为“关键说谎者”，真相里追加对应段落
export const LIE_NOTE = {
  laozhou: '这一局最关键的一句谎，来自老周。他咬定“704 三年没人住”，却亲手把空担架抬下楼——那副担架本该让所有人更早想到衣柜后的暗间。',
  chenjie: '这一局最关键的一句谎，来自陈姐。她每天往 704 送饭，却把周宁最后出现的地方说成“早就锁了”，让所有人多绕了整整两个小时。',
  shenmo: '这一局最关键的一句谎，来自沈默。他说监控是自动覆盖的，而消失的那七分钟里，机房的画面正对着 B1 的门。',
  xutang: '这一局最关键的一句谎，来自许棠。她说自己只是回来拿遗物，却早就知道爷爷还活着，也知道周宁在替谁冒险。'
};

export const CHAT_LINES = {
  1: [
    '谁把 704 的号拉回来的？',
    '许国平不是三年前就……',
    '别乱说，可能是盗号。',
    '我刚看见 704 门口有外卖。',
    '今晚谁值班？',
    '我有点不敢坐电梯。'
  ],
  2: [
    '704 的灯是不是亮了？',
    '我好像听见里面有椅子响。',
    '空置房哪来的电？',
    '别一个人上楼。',
    '谁有 704 的钥匙？',
    '要不直接报警吧。'
  ],
  3: [
    '周宁回你消息了吗？',
    '电梯刚才自己停在 7 楼。',
    '监控怎么黑了七分钟。',
    '她工牌掉在电梯里了。',
    '03:00 那张照片谁发的？',
    '别在群里说了，我害怕。'
  ],
  4: [
    '你们听见 B1 的声音了吗？',
    '三长两短……是求救吗？',
    '机房的门谁能开？',
    '我下去看看。',
    '别一个人去。',
    '许巍不是早就离职了吗？'
  ],
  5: [
    '天快亮了。',
    '垃圾车进来了。',
    '再不做决定就来不及了。',
    '704 里有动静。',
    '我们到底救不救？',
    '谁还有没说的？'
  ]
};

export const LIAR_LINES = {
  laozhou: ['704 三年没人住了。', '钥匙？早就丢了。', '三年前那晚我什么都没看见。'],
  chenjie: ['B1 我锁了，没人进得去。', '我就是个保洁，别问我。', '饭？什么饭。'],
  shenmo: ['监控是自动覆盖的。', '账号不是我恢复的。', '机房我今晚没去过。'],
  xutang: ['我只是回来拿遗物。', '我不认识周宁。', '我爷爷三年前就死了。']
};

export const FILLER = {
  title: '没有新的发现',
  text: '你在原地站了一会儿，只听见 B1 的风机声。这里已经没有更多东西了。',
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
    q: '周宁现在最可能在哪里？',
    hint: '她最后出现的地方，和声音传出来的地方，不一定是同一个。',
    answer: 'machine',
    options: [
      { id: 'room704', label: '704 暗间' },
      { id: 'storage', label: 'B1 储藏室' },
      { id: 'machine', label: '电梯机房' },
      { id: 'rooftop', label: '天台' }
    ]
  },
  {
    id: 'q2',
    q: '今晚谁最可能在说谎？',
    hint: '每个人都在隐瞒，但只有一件事最耽误找到他们。',
    answer: 'shenmo',
    options: ROLES.map((role) => ({ id: role.id, label: `${role.name} · ${role.job}` }))
  },
  {
    id: 'q3',
    q: '天亮之前，你们怎么做？',
    hint: '这是唯一一个没有标准答案的问题。',
    answer: 'help',
    options: [
      { id: 'help', label: '先救人' },
      { id: 'police', label: '报警' },
      { id: 'property', label: '通知物业' },
      { id: 'silence', label: '保持沉默' }
    ]
  }
];

export const HIDDEN = {
  q3: 'help',
  requireQ1: true,
  requireQ2: true,
  clues: ['C225', 'C226']
};

// 每局随机一个关押点：真相段落、关键线索、结局文案都会跟着变
export const SPOTS = [
  {
    id: 'machine',
    name: '电梯机房',
    hiddenClues: ['C225', 'C226']
  },
  {
    id: 'storage',
    name: 'B1 储藏室',
    patches: {
      C225: {
        text: '机房的地上有一支摔坏的录音笔，卡槽是空的。有人取走了存储卡，只留下许巍的半句话：“你再管，就别想出去。”',
        tag: '他在这里威胁过她'
      }
    },
    truthPatch: {
      4: '许巍在 B1 追上他们，把周宁关进储藏室，又把老许转移回 704。B1 的三长两短，是周宁敲管道发出的求救。',
      5: '你们在天亮前找到了储藏室和暗间。老许还活着，周宁也还活着，剩下的只是选择。'
    },
    endings: {
      help_fail: {
        text: '你们决定先救人，却没有找到储藏室。05:10，垃圾车开进院子，有人推着一辆盖着白布的推车从 B1 慢慢出来。你们追上去时，推车已经空了，储藏室的门开着，里面没有人。'
      }
    },
    hiddenClues: ['C219', 'C220']
  },
  {
    id: 'rooftop',
    name: '天台水箱后',
    patches: {
      C212: {
        text: '天台水箱后的消防梯被人放了下来，末端系着一条打结的床单。有人打算从楼外把老人带下去，可这条退路最后只够一个人用。',
        tag: '她准备好了退路'
      },
      C225: {
        text: '机房里只有一支没电的录音笔，里面什么都没有。她在这里被问过话，但没有被关在这里。',
        tag: '这里已经不是关她的地方'
      }
    },
    truthPatch: {
      4: '许巍在 B1 追上他们，把周宁拖上天台锁在水箱后面，又把老许转移回 704。天台放下的消防梯，是她给自己留的退路。',
      5: '你们在天亮前找到了天台和暗间。老许还活着，周宁也还活着，剩下的只是选择。'
    },
    endings: {
      help_fail: {
        text: '你们决定先救人，却没有想到天台。05:10，垃圾车开进院子，有人推着一辆盖着白布的推车从 B1 慢慢出来。你们追上去时，推车已经空了，电梯停在 704，门开着，里面没有人。'
      },
      hidden: {
        text: '你们在警察到之前把老许背下楼，也从水箱后把周宁扶了出来，录音笔和暗间照片同时发进群里。许棠公开了全部证据，整栋楼第一次没有一个人退群。许巍在车库被拦下时，老许用孙女的手机发了三个字：“我回来了。”'
      }
    },
    hiddenClues: ['C212']
  }
];

export const EXPOSES = {
  C205: ['xutang'], C208: ['laozhou'], C230: ['laozhou'],
  C209: ['chenjie'], C220: ['chenjie'], C229: ['chenjie'],
  C201: ['shenmo'], C214: ['shenmo'], C221: ['shenmo'],
  C210: ['xutang'], C213: ['xutang'], C228: ['xutang']
};
