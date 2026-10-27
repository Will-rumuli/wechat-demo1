import { onTap, onTouchMove, onTouchEnd, startLoop } from './core/screen.js';
import { hasUser, silentLogin, isLoggedOut } from './core/user.js';
import { initCloud } from './core/cloud.js';
import { pullCloudStats } from './core/storage.js';
import Login from './scenes/login.js';
import Intro from './scenes/intro.js';
import Catalog from './scenes/catalog.js';
import Detail from './scenes/detail.js';
import Role from './scenes/role.js';
import Game from './scenes/game.js';
import Vote from './scenes/vote.js';
import Result from './scenes/result.js';

function parseInvite(query) {
  if (!query) return null;
  const roomId = query.roomId || query.roomid;
  if (!roomId) return null;
  return {
    roomId: String(roomId),
    caseId: String(query.caseId || query.caseid || 'case1')
  };
}

class Main {
  constructor() {
    this.scenes = {
      login: Login,
      intro: Intro,
      catalog: Catalog,
      detail: Detail,
      role: Role,
      game: Game,
      vote: Vote,
      result: Result
    };
    this.current = null;
    this.sceneName = '';
    this.pendingInvite = null;

    try {
      const launch = wx.getLaunchOptionsSync();
      this.pendingInvite = parseInvite(launch && launch.query);
    } catch (e) {
      this.pendingInvite = null;
    }

    initCloud();

    try {
      wx.showShareMenu({
        withShareTicket: false,
        menus: ['shareAppMessage', 'shareTimeline']
      });
    } catch (e) {
      // 忽略不支持分享的环境
    }

    // 右上角「···」转发：能拿到当前房间就带上房间号，否则用统一文案
    try {
      wx.onShareAppMessage(() => {
        const scene = this.current;
        if (scene && scene.shareInfo) {
          const info = scene.shareInfo();
          if (info) return info;
        }
        return { title: '我们群里少了一个人 · 悬疑剧本杀' };
      });
    } catch (e) {
      // 忽略
    }

    // 静默登录：启动即用微信号识别账号，成功后顺带拉一次云存档；只有主动退出过才回登录页
    if (isLoggedOut()) {
      this.go('login');
    } else {
      silentLogin().then((user) => {
        if (user) pullCloudStats();
      });
      this.go('intro');
    }

    onTap((x, y) => {
      if (this.current && this.current.tap) this.current.tap(x, y);
    });

    onTouchMove((x, y) => {
      if (this.current && this.current.move) this.current.move(x, y);
    });

    onTouchEnd(() => {
      if (this.current && this.current.end) this.current.end();
    });

    try {
      wx.onShow((res) => {
        const invite = parseInvite(res && res.query);
        if (!invite) return;
        this.pendingInvite = invite;
        if (!hasUser()) return;
        if (this.sceneName === 'catalog') {
          this.pendingInvite = null;
          this.go('detail', { ...invite, autoJoin: true });
        }
      });
    } catch (e) {
      // 忽略
    }

    startLoop(
      (dt) => {
        if (this.current && this.current.update) this.current.update(dt);
      },
      (ctx) => {
        if (this.current && this.current.render) this.current.render(ctx);
      }
    );
  }

  go(name, params) {
    const Scene = this.scenes[name];
    if (!Scene) return;
    this.sceneName = name;
    this.current = new Scene(this, params || {});
    if (this.current.enter) this.current.enter();
  }

  consumeInvite() {
    const invite = this.pendingInvite;
    this.pendingInvite = null;
    return invite;
  }
}

export default Main;
