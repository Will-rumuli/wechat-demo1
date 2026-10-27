import { W, H, TOP, BOTTOM } from '../core/screen.js';
import { COLORS, drawBackdrop, drawSilhouette, text, fillRound, strokeRound } from '../ui/theme.js';
import { Button } from '../ui/widgets.js';
import { unlock, playTap } from '../core/audio.js';
import { wechatLogin, wechatLoginError, wechatLoginDetail } from '../core/user.js';

export default class Login {
  constructor(app, params) {
    this.app = app;
    this.time = 0;
    this.busy = false;
    this.notice = (params && params.toast) || '';
    this.toast = '';
    this.toastDetail = '';
    this.toastT = 0;

    const bx = 32;
    const bw = W - 64;
    this.wechatBtn = new Button({
      x: bx, y: H - BOTTOM - 150, w: bw, h: 54,
      label: '微信一键登录',
      onTap: () => this.doWechat()
    });
  }

  update(dt) {
    this.time += dt;
    this.wechatBtn.update(dt);
    if (this.toastT > 0) this.toastT = Math.max(0, this.toastT - dt);
  }

  tap(x, y) {
    if (this.busy) return;
    unlock();
    this.wechatBtn.tap(x, y);
  }

  async doWechat() {
    if (this.busy) return;
    this.busy = true;
    playTap();
    const user = await wechatLogin();
    this.busy = false;
    if (user) {
      this.app.go('intro');
      return;
    }
    const reason = wechatLoginError();
    const map = {
      wx: '微信环境异常，请改用本机登录',
      cloud: '云开发未初始化，请检查环境 ID',
      network: '连不上云函数，请检查环境 ID',
      denied: '未获取到 openid，请重试',
      server: '云函数版本过旧，请重新部署 room'
    };
    this.toast = map[reason] || '微信登录失败，请稍后再试';
    this.toastDetail = wechatLoginDetail();
    this.toastT = 4;
  }

  render(ctx) {
    drawBackdrop(ctx, this.time, 0.52);

    const compact = H < 700;
    const titleSize = W < 360 ? 23 : (compact ? 25 : 28);
    const usableTop = TOP + 18;
    const blockBottom = H - BOTTOM - (compact ? 200 : 240);
    const blockH = Math.max(190, blockBottom - usableTop);
    const titleY = usableTop + blockH * 0.64;
    const line2Y = titleY + titleSize * 1.5;
    const subY = line2Y + (compact ? 28 : 36);

    text(ctx, '微信群 · 7 号楼', W / 2, TOP + 34, {
      size: 10, color: 'rgba(138,147,163,0.9)', align: 'center', maxWidth: W - 64
    });

    drawSilhouette(ctx, 'flashlight', W / 2, usableTop + blockH * 0.16 + (compact ? 6 : 0), compact ? 0.88 : 1.1, 'rgba(242,193,78,0.45)');

    text(ctx, '我们群里', W / 2, titleY, {
      size: titleSize, color: COLORS.paper, align: 'center', weight: 600, maxWidth: W - 64
    });
    text(ctx, '少了一个人', W / 2, line2Y, {
      size: titleSize, color: COLORS.paper, align: 'center', weight: 600, maxWidth: W - 64
    });

    text(ctx, '在开始之前，先让邻居们认识你。', W / 2, subY, {
      size: 12, color: COLORS.gray, align: 'center', maxWidth: W - 64
    });

    if (!compact) {
      const cardY = subY + 22;
      fillRound(ctx, 32, cardY, W - 64, 62, 14, 'rgba(245,241,232,0.05)');
      strokeRound(ctx, 32, cardY, W - 64, 62, 14, 'rgba(245,241,232,0.1)');
      text(ctx, this.busy ? '正在登录…' : '登录后可保存进度、收集结局，并邀请好友组队', W / 2, cardY + 26, {
        size: 11, color: 'rgba(245,241,232,0.72)', align: 'center', maxWidth: W - 96
      });
      text(ctx, this.busy ? '请稍候' : '你的昵称与头像只会展示给同房间的玩家', W / 2, cardY + 46, {
        size: 10, color: 'rgba(138,147,163,0.8)', align: 'center', maxWidth: W - 96
      });
    } else if (this.toastT <= 0) {
      text(ctx, this.busy ? '正在登录…' : '登录后可保存进度、邀请好友组队', W / 2, H - BOTTOM - 214, {
        size: 10, color: 'rgba(138,147,163,0.82)', align: 'center', maxWidth: W - 64
      });
    }

    this.wechatBtn.draw(ctx, this.time);

    const hintY = H - BOTTOM - 40;
    if (this.notice) {
      text(ctx, this.notice, W / 2, hintY, {
        size: 11, color: COLORS.amber, align: 'center', maxWidth: W - 64
      });
    } else {
      text(ctx, '微信登录只识别账号，不会读取昵称与头像', W / 2, hintY, {
        size: 10, color: 'rgba(138,147,163,0.72)', align: 'center', maxWidth: W - 64
      });
    }

    if (this.toastT > 0) {
      if (compact) {
        // 小屏：按钮上方空间只够两行文字，直接铺在按钮上沿
        text(ctx, this.toast, W / 2, H - BOTTOM - 214, {
          size: 11, color: '#E28B80', align: 'center', maxWidth: W - 64
        });
        if (this.toastDetail) {
          text(ctx, this.toastDetail, W / 2, H - BOTTOM - 196, {
            size: 9, color: 'rgba(226,139,128,0.7)', align: 'center', maxWidth: W - 56
          });
        }
      } else {
        const tw = Math.min(W - 64, 300);
        const th = this.toastDetail ? 54 : 40;
        const ty = this.wechatBtn.y - th - 10;
        fillRound(ctx, (W - tw) / 2, ty, tw, th, 10, 'rgba(192,57,43,0.92)');
        text(ctx, this.toast, W / 2, ty + 22, {
          size: 11, color: '#FFF6F2', align: 'center', maxWidth: tw - 24
        });
        if (this.toastDetail) {
          text(ctx, this.toastDetail, W / 2, ty + 40, {
            size: 9, color: 'rgba(255,246,242,0.78)', align: 'center', maxWidth: tw - 24
          });
        }
      }
    }
  }
}
