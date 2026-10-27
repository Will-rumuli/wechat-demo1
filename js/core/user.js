// 本机用户资料：昵称、头像、展示 ID。登录状态保存在本地，联机时再同步到房间。
import { roomApi } from './cloud.js';

const KEY = 'wgq_user_v1';
// 主动退出登录的标记：有它就不再静默登录，走登录页
const OUT_KEY = 'wgq_logged_out_v1';

let cached = null;

function randomDigits(n) {
  let out = '';
  for (let i = 0; i < n; i += 1) out += Math.floor(Math.random() * 10);
  return out;
}

function makeShortId() {
  return `#${randomDigits(4)}`;
}

function makeNickname() {
  return `邻居${randomDigits(3)}`;
}

// 由 openid 派生固定数字，保证同一个微信号每次登录拿到同样的昵称和展示 ID
function stableDigits(id, n) {
  const str = String(id || '');
  let h = 7;
  for (let i = 0; i < str.length; i += 1) {
    h = (h * 31 + str.charCodeAt(i)) % 100000;
  }
  return String(h).padStart(n, '0').slice(-n);
}

function normalize(user) {
  if (!user || !user.nickName) return null;
  return {
    id: user.id || `local_${Date.now()}`,
    nickName: String(user.nickName).slice(0, 12),
    avatarUrl: user.avatarUrl || '',
    shortId: user.shortId || makeShortId(),
    local: !!user.local,
    createdAt: user.createdAt || Date.now()
  };
}

export function loadUser() {
  if (cached) return cached;
  try {
    const raw = wx.getStorageSync(KEY);
    const data = raw && typeof raw === 'string' ? JSON.parse(raw) : raw;
    cached = normalize(data);
  } catch (e) {
    cached = null;
  }
  return cached;
}

export function saveUser(user) {
  cached = normalize(user);
  if (!cached) return null;
  try {
    wx.setStorageSync(KEY, cached);
  } catch (e) {
    // 本地存储失败不影响本局
  }
  return cached;
}

export function hasUser() {
  return !!loadUser();
}

export function localLogin() {
  clearLoggedOut();
  return saveUser({
    id: `local_${Date.now()}_${randomDigits(3)}`,
    nickName: makeNickname(),
    avatarUrl: '',
    shortId: makeShortId(),
    local: true
  });
}

let lastError = '';
let lastDetail = '';

// 把一长串 errMsg 压成一眼能看懂的一行，优先保留 errCode
function briefError(msg) {
  const str = String(msg || '').replace(/\s+/g, ' ').trim();
  const code = str.match(/errCode:\s*(-?\d+)/);
  if (code) return `errCode ${code[1]}`;
  return str.slice(0, 60);
}

export function wechatLoginError() {
  return lastError;
}

export function wechatLoginDetail() {
  return lastDetail;
}

// 微信登录：wx.login 建立会话，云端用 getWXContext 取 openid 作为账号 ID。
// 微信已不再返回真实昵称头像，昵称与展示 ID 由 openid 派生，保证换设备仍是同一个人。
export function wechatLogin() {
  return new Promise((resolve) => {
    lastError = '';
    lastDetail = '';
    if (typeof wx === 'undefined' || !wx.login) {
      lastError = 'wx';
      lastDetail = '当前环境没有 wx.login';
      resolve(null);
      return;
    }
    try {
      wx.login({
        success: async (res) => {
          if (!res || !res.code) {
            lastError = 'wx';
            lastDetail = 'wx.login 没有返回 code';
            resolve(null);
            return;
          }
          const out = await roomApi.whoami();
          if (!out || !out.ok || !out.openid) {
            lastError = (out && out.error) || 'cloud';
            lastDetail = briefError((out && out.message) || `whoami 返回 ${JSON.stringify(out)}`);
            resolve(null);
            return;
          }
          clearLoggedOut();
          resolve(saveUser({
            id: out.openid,
            // 昵称与展示 ID 由云端查重后下发；旧版云函数没有该字段时退回本地派生
            nickName: out.nickName || `邻居${stableDigits(out.openid, 3)}`,
            avatarUrl: '',
            shortId: out.shortId || `#${stableDigits(`${out.openid}x`, 4)}`,
            local: false
          }));
        },
        fail: (err) => {
          lastError = 'wx';
          lastDetail = (err && err.errMsg) || 'wx.login fail';
          resolve(null);
        }
      });
    } catch (e) {
      lastError = 'wx';
      lastDetail = (e && e.message) || 'wx.login 异常';
      resolve(null);
    }
  });
}

// 静默登录：启动时自动完成，成功返回账号；离线时退回本地账号，不打断游戏
export async function silentLogin() {
  if (isLoggedOut()) return null;
  const current = loadUser();
  // 已经用 openid 登录过，直接用本地缓存，不阻塞启动
  if (current && current.id && !String(current.id).startsWith('local_')) return current;
  const wxUser = await wechatLogin();
  if (wxUser) return wxUser;
  return current || localLogin();
}

export function isLoggedOut() {
  try {
    return !!wx.getStorageSync(OUT_KEY);
  } catch (e) {
    return false;
  }
}

function clearLoggedOut() {
  try {
    if (wx.getStorageSync(OUT_KEY)) wx.setStorageSync(OUT_KEY, '');
  } catch (e) {
    // 忽略
  }
}

// 退出登录：清掉本地账号，下次进入小游戏会重新走登录页
export function logout() {
  cached = null;
  try {
    if (typeof wx !== 'undefined' && wx.removeStorageSync) {
      wx.removeStorageSync(KEY);
    } else if (typeof wx !== 'undefined') {
      wx.setStorageSync(KEY, '');
    }
    if (typeof wx !== 'undefined') wx.setStorageSync(OUT_KEY, 1);
  } catch (e) {
    // 清除失败也不影响本次退出
  }
}
