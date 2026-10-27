// AI 队友行为：所有剧本数据由调用方传入，便于多剧本复用

export function createTeammates(roles, humanRoleId) {
  return roles
    .filter((role) => role.id !== humanRoleId)
    .map((role) => ({
      role,
      clues: [],
      visited: {},
      spoke: false
    }));
}

export function pickLocation(bot, locations) {
  const fresh = locations.filter((id) => !bot.visited[id]);
  const pool = fresh.length ? fresh : locations;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function shorten(str, max = 34) {
  return str.length > max ? `${str.slice(0, max)}……` : str;
}

export function shareMessage(clue) {
  return `【${clue.title}】${shorten(clue.text)}`;
}

export function idleMessage(script, act, round) {
  const pool = script.CHAT_LINES[act] || script.CHAT_LINES[1];
  const idx = (round + Math.floor(Math.random() * pool.length)) % pool.length;
  return pool[idx];
}

export function defendMessage(script, bot) {
  const lines = script.LIAR_LINES[bot.role.id] || ['我没什么好说的。'];
  return lines[Math.floor(Math.random() * lines.length)];
}

export function exposedRoles(script, clueId) {
  return (script.EXPOSES && script.EXPOSES[clueId]) || [];
}

export function reactionTo(script, clueId, bots) {
  const targets = bots.filter((bot) => exposedRoles(script, clueId).indexOf(bot.role.id) !== -1);
  if (!targets.length) {
    const pool = ['这条有点意思。', '你在哪找到的？', '先记下来。', '这能说明什么？'];
    return { roleId: bots[Math.floor(Math.random() * bots.length)].role.id, text: pool[Math.floor(Math.random() * pool.length)] };
  }
  const target = targets[Math.floor(Math.random() * targets.length)];
  if (Math.random() < 0.7) {
    return { roleId: target.role.id, text: defendMessage(script, target) };
  }
  return { roleId: target.role.id, text: '……你别盯着我看。' };
}

export function accusation(bots) {
  if (!bots.length) return null;
  const bot = bots[Math.floor(Math.random() * bots.length)];
  const others = bots.filter((item) => item.role.id !== bot.role.id);
  if (!others.length) return null;
  const target = others[Math.floor(Math.random() * others.length)];
  return { roleId: bot.role.id, text: `${target.role.name}，你今晚到底在干什么？` };
}
