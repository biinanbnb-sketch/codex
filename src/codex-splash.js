/*!
 * Codex Splash — 启动 · 认证 · 欢迎 全屏叠加动画
 * 单文件、无依赖。页面里调用 CodexSplash.start(options) 即可播放，播完自动退场并移除自己。
 *
 *   CodexSplash.start({
 *     name:   '开发者',   // 欢迎语和操作员里显示的名字
 *     nameEn: 'DEVELOPER',    // 英文副标题里的名字
 *     user:   'dev',    // 终端提示符里的用户名
 *     sound:  true,     // 自动播放音效（浏览器需要用户点击过页面才能出声，Electron 默认可以）
 *     hold:   1400,     // 欢迎画面停留多久再退场（毫秒）
 *     onDone: () => {}  // 动画结束、叠加层移除后回调
 *   });
 *
 * 样式全部放在 Shadow DOM 里，不影响宿主页面；不使用 innerHTML，兼容严格的 CSP / Trusted Types。
 * 按 Esc 或点右上角「跳过」直接跳到结尾。
 */
(function (global) {
'use strict';

const DEFAULTS = { name: '啊木', nameEn: 'DEVELOPER', user: 'amu', sound: true, hold: 1400, zIndex: 2147483647, onDone: null };

const CSS = `
:host{all:initial;
  --bg:#04070b; --bg-raise:#0a1722; --panel:rgba(8,19,28,.68);
  --ink:#e6f8ff; --text-2:#93afbf; --mute:#56768a; --dim:#1c3242;
  --cyan:#3fd8ff; --cyan-soft:rgba(63,216,255,.42); --cyan-wash:rgba(63,216,255,.08); --line:rgba(63,216,255,.05);
  --ok:#5cf2b0; --ok-soft:rgba(92,242,176,.45); --ok-wash:rgba(92,242,176,.09);
  --warn:#ffb547; --hot:#ff3d7f; --shade:rgba(0,0,0,.62); --scan:rgba(0,0,0,.26);
  --display:"Martian Mono","JetBrains Mono","IBM Plex Mono",Menlo,Consolas,monospace;
  --mono:"IBM Plex Mono","JetBrains Mono",ui-monospace,Menlo,Consolas,monospace;
  --han:"PingFang SC","Noto Sans SC","Hiragino Sans GB","Microsoft YaHei",sans-serif;
  color-scheme:dark}
*{box-sizing:border-box}
.stage{position:fixed;inset:0;overflow:hidden;background:var(--bg);color:var(--ink);font-family:var(--mono);
  font-size:14px;line-height:normal;text-align:left;-webkit-font-smoothing:antialiased;
  padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px));
  --gl:max(clamp(16px,2.6vw,34px),env(safe-area-inset-left,0px));
  --gr:max(clamp(16px,2.6vw,34px),env(safe-area-inset-right,0px));
  --gt:calc(env(safe-area-inset-top,0px) + clamp(20px,2.6vw,32px));
  --gb:calc(env(safe-area-inset-bottom,0px) + clamp(18px,2.4vw,30px))}
.screen{position:absolute;inset:0;transform-origin:50% 44%;background:radial-gradient(110% 80% at 50% 44%,var(--bg-raise) 0%,var(--bg) 62%)}
.stage.boot .screen{animation:crt-on .72s cubic-bezier(.2,.7,.1,1) both}
@keyframes crt-on{0%{transform:scale(0,.004);filter:brightness(3.2)}36%{transform:scale(1,.004);filter:brightness(3.2)}70%{transform:scale(1,1.015);filter:brightness(1.5)}100%{transform:none;filter:none}}
.stage.exit{background:transparent;transition:background .25s ease .3s}
.stage.exit .screen{animation:crt-off .6s cubic-bezier(.6,0,.9,.4) both}
@keyframes crt-off{0%{transform:none;filter:none;opacity:1}48%{transform:scale(1,.004);filter:brightness(3);opacity:1}100%{transform:scale(0,.004);filter:brightness(3);opacity:0}}
.flash{position:absolute;inset:0;z-index:6;pointer-events:none;opacity:0;background:radial-gradient(ellipse 70% 60% at 50% 44%,var(--ink) 0%,var(--cyan) 28%,transparent 70%)}
.stage.boot .flash{animation:flash .8s ease-out both}
@keyframes flash{0%{opacity:1}40%{opacity:.8}100%{opacity:0}}
.grid{position:absolute;inset:0;z-index:0;opacity:.9;
  background-image:linear-gradient(var(--line) 1px,transparent 1px),linear-gradient(90deg,var(--line) 1px,transparent 1px);
  background-size:48px 48px;background-position:center 44%;
  -webkit-mask-image:radial-gradient(ellipse 58% 52% at 50% 44%,#000 0%,transparent 78%);
  mask-image:radial-gradient(ellipse 58% 52% at 50% 44%,#000 0%,transparent 78%)}
.fx{position:absolute;inset:0;width:100%;height:100%;z-index:1;display:block}
.scan{position:absolute;inset:0;z-index:5;pointer-events:none;
  background:radial-gradient(ellipse at 50% 46%,transparent 52%,var(--shade) 100%),repeating-linear-gradient(to bottom,transparent 0 2px,var(--scan) 2px 3px)}

.core{position:absolute;left:50%;top:44%;transform:translate(-50%,-50%);z-index:2;display:flex;flex-direction:column;align-items:center;
  gap:clamp(14px,2.4vh,26px);pointer-events:none;transition:top .85s cubic-bezier(.2,.7,.1,1),transform .85s cubic-bezier(.2,.7,.1,1)}
.core.up{top:26%;transform:translate(-50%,-50%) scale(.62)}
.slot{position:relative}
.logo{position:absolute;opacity:0;mix-blend-mode:screen}
.logo.on{opacity:1;animation:logo-in .6s linear both}
@keyframes logo-in{
  0%{opacity:0;clip-path:inset(42% 0 50% 0);transform:translateX(-16px);filter:drop-shadow(5px 0 0 var(--hot)) drop-shadow(-5px 0 0 var(--cyan))}
  10%{opacity:1;clip-path:inset(12% 0 64% 0);transform:translateX(12px)}
  22%{clip-path:inset(58% 0 10% 0);transform:translateX(-7px)}
  34%{clip-path:inset(0 0 0 0);transform:translateX(4px);filter:drop-shadow(3px 0 0 var(--hot)) drop-shadow(-3px 0 0 var(--cyan))}
  46%{clip-path:inset(30% 0 46% 0);transform:translateX(-3px)}
  58%{clip-path:inset(0 0 0 0);transform:translateX(1px)}
  76%{transform:none;filter:drop-shadow(1px 0 0 var(--hot)) drop-shadow(-1px 0 0 var(--cyan))}
  100%{opacity:1;clip-path:inset(0 0 0 0);transform:none;filter:none}}
.sub{font:500 clamp(10px,1.05vw,12.5px)/1.4 var(--mono);letter-spacing:.5em;padding-left:.5em;color:var(--text-2);white-space:nowrap;height:1.4em;opacity:0;transition:opacity .3s}
.sub.on{opacity:1}
.load{width:min(400px,76vw);opacity:0;transition:opacity .45s}
.load.on{opacity:1}
.load.gone{opacity:0}
.bar{position:relative;height:4px;background:repeating-linear-gradient(90deg,var(--dim) 0 6px,transparent 6px 8px)}
.bar .fill{position:absolute;left:0;top:0;bottom:0;width:0;background:repeating-linear-gradient(90deg,var(--cyan) 0 6px,transparent 6px 8px);filter:drop-shadow(0 0 5px var(--cyan-soft))}
.bar .head{position:absolute;top:-4px;left:0;width:2px;height:12px;margin-left:-1px;background:var(--ink);box-shadow:0 0 12px 2px var(--cyan)}
.stage.ready .bar .head{opacity:0;transition:opacity .4s}
.meta{display:flex;justify-content:space-between;align-items:baseline;gap:16px;margin-top:10px;font:500 11px/1.3 var(--mono);letter-spacing:.08em;color:var(--mute);font-variant-numeric:tabular-nums}
.status::before{content:"▸ ";color:var(--cyan)}
.stage.ready .status,.stage.ready .status::before{color:var(--warn)}
.pct{color:var(--ink)}

.deck{position:absolute;left:50%;top:59%;transform:translate(-50%,-50%);z-index:2;width:min(620px,calc(100% - 32px));display:grid;pointer-events:none}
.deck > *{grid-area:1/1}
.auth{position:relative;display:flex;align-items:center;gap:clamp(14px,3vw,30px);padding:clamp(14px,2.4vw,24px);background:var(--panel);visibility:hidden}
.auth.on{visibility:visible;animation:panel-in .5s cubic-bezier(.2,.7,.1,1) both}
.auth.off{animation:panel-out .36s cubic-bezier(.6,0,.9,.4) both}
.auth.gone{visibility:hidden}
@keyframes panel-in{0%{transform:scale(.04,.012);filter:brightness(3)}40%{transform:scale(1,.012);filter:brightness(3)}100%{transform:none;filter:none}}
@keyframes panel-out{0%{transform:none;opacity:1}55%{transform:scale(1,.012);filter:brightness(2.4);opacity:1}100%{transform:scale(0,.012);opacity:0}}
.auth > i{position:absolute;width:12px;height:12px;border:0 solid var(--cyan-soft);transition:border-color .3s}
.auth > i:nth-of-type(1){top:0;left:0;border-top-width:1px;border-left-width:1px}
.auth > i:nth-of-type(2){top:0;right:0;border-top-width:1px;border-right-width:1px}
.auth > i:nth-of-type(3){bottom:0;left:0;border-bottom-width:1px;border-left-width:1px}
.auth > i:nth-of-type(4){bottom:0;right:0;border-bottom-width:1px;border-right-width:1px}
.auth.ok > i{border-color:var(--ok-soft)}
.ring{position:relative;flex:none;width:clamp(96px,19vw,172px);aspect-ratio:1;max-width:100%}
.ring canvas{width:100%;height:100%;display:block}
.ring::after{content:"";position:absolute;inset:0;border-radius:50%;border:1px solid var(--ok);opacity:0;pointer-events:none}
.auth.ok .ring::after{animation:ping .9s ease-out both}
@keyframes ping{0%{opacity:.9;transform:scale(.5)}100%{opacity:0;transform:scale(1.9)}}
.ab{min-width:0;flex:1;display:flex;flex-direction:column;gap:8px}
.ak{font:500 10.5px/1.3 var(--mono);letter-spacing:.2em;color:var(--cyan);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-height:1.3em}
.auth.ok .ak{color:var(--ok)}
.at{font:700 clamp(20px,2.6vw,28px)/1.2 var(--han);letter-spacing:.14em;color:var(--ink);min-height:1.2em;white-space:nowrap}
.auth.ok .at{color:var(--ok)}
.op{display:flex;align-items:center;gap:12px;font:500 11px/1.4 var(--mono);letter-spacing:.12em;color:var(--mute);border-top:1px solid var(--dim);border-bottom:1px solid var(--dim);padding-block:7px}
.op .val{font:700 15px/1.2 var(--han);color:var(--ink);letter-spacing:.16em;min-width:3em}
.op .chip{margin-left:auto;font:600 10px/1 var(--mono);letter-spacing:.14em;color:var(--bg);background:var(--ok);padding:4px 7px;opacity:0;transform:translateY(3px);transition:opacity .3s,transform .3s}
.op .chip.on{opacity:1;transform:none}
.alist{list-style:none;margin:0;padding:0;display:grid;gap:3px;font:400 12px/1.5 var(--mono)}
.alist li{display:grid;grid-template-columns:8px 6.4em minmax(0,1fr) auto;align-items:center;gap:10px;color:var(--mute)}
.alist .ico{width:7px;height:7px;border:1px solid var(--mute)}
.alist .nm{font-family:var(--han);font-weight:500;color:var(--text-2);letter-spacing:.06em;white-space:nowrap}
.alist .en{font-size:10px;letter-spacing:.12em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.alist .st{font-family:var(--han);font-size:11.5px;letter-spacing:.08em;text-align:right;white-space:nowrap}
.alist li.run .ico{border-color:var(--cyan);background:var(--cyan);animation:pulse .4s steps(2) infinite}
.alist li.run .st{color:var(--cyan)}
.alist li.ok .ico{border-color:var(--ok);background:var(--ok);box-shadow:0 0 6px var(--ok)}
.alist li.ok .st{color:var(--ok)}

.welcome{visibility:hidden;text-align:center;display:flex;flex-direction:column;align-items:center;gap:clamp(10px,1.6vh,16px)}
.welcome.on{visibility:visible}
.wk{font:500 10.5px/1.3 var(--mono);letter-spacing:.24em;color:var(--ok);min-height:1.3em;white-space:nowrap}
.wt{margin:0;font:900 clamp(30px,6.2vw,70px)/1.12 var(--han);letter-spacing:.06em;color:var(--ink);white-space:nowrap;text-shadow:0 0 24px var(--cyan-soft)}
.wt .nm{color:var(--cyan)}
.welcome.on .wt{animation:w-in .75s linear both}
@keyframes w-in{
  0%{opacity:0;clip-path:inset(45% 0 45% 0);transform:translateX(-18px) skewX(-8deg);text-shadow:6px 0 var(--hot),-6px 0 var(--cyan)}
  12%{opacity:1;clip-path:inset(8% 0 62% 0);transform:translateX(14px)}
  24%{clip-path:inset(55% 0 12% 0);transform:translateX(-8px)}
  36%{clip-path:inset(0 0 0 0);transform:translateX(4px) skewX(4deg);text-shadow:3px 0 var(--hot),-3px 0 var(--cyan)}
  50%{clip-path:inset(28% 0 40% 0);transform:none}
  62%{clip-path:inset(0 0 0 0)}
  80%{text-shadow:1px 0 var(--hot),-1px 0 var(--cyan)}
  100%{opacity:1;clip-path:inset(0 0 0 0);transform:none;text-shadow:0 0 24px var(--cyan-soft)}}
.we{font:500 clamp(10.5px,1.1vw,13px)/1.3 var(--mono);letter-spacing:.42em;padding-left:.42em;color:var(--text-2);min-height:1.3em;white-space:nowrap}
.wline{width:min(420px,70vw);height:1px;background:linear-gradient(90deg,transparent,var(--cyan),transparent);transform:scaleX(0);transition:transform .9s cubic-bezier(.2,.7,.1,1)}
.welcome.on .wline{transform:scaleX(1)}
.wmode{display:flex;align-items:center;gap:12px;flex-wrap:wrap;justify-content:center;opacity:0;transform:translateY(6px);transition:opacity .4s,transform .4s}
.wmode.on{opacity:1;transform:none}
.mchip{display:inline-flex;align-items:center;gap:9px;font:700 14px/1 var(--han);letter-spacing:.22em;color:var(--ok);border:1px solid var(--ok-soft);background:var(--ok-wash);padding:8px 12px}
.mchip i{width:7px;height:7px;background:var(--ok);box-shadow:0 0 10px var(--ok)}
.men{font:500 10.5px/1 var(--mono);letter-spacing:.22em;color:var(--mute)}
.wstats{margin:0;display:flex;flex-wrap:wrap;justify-content:center;gap:6px 0;font:400 12px/1.4 var(--han);opacity:0;transition:opacity .5s}
.wstats.on{opacity:1}
.wstats div{display:flex;gap:8px;padding:0 14px;border-left:1px solid var(--dim)}
.wstats div:first-child{border-left:0}
.wstats dt{color:var(--mute)}
.wstats dd{margin:0;color:var(--ink)}

.hud{position:absolute;z-index:3;font:500 10.5px/1.6 var(--mono);letter-spacing:.1em;color:var(--mute)}
.tl{top:var(--gt);left:var(--gl)}
.tr{top:var(--gt);right:var(--gr);text-align:right;display:flex;flex-direction:column;align-items:flex-end;gap:10px}
.br{bottom:var(--gb);right:var(--gr)}
.ht{display:flex;align-items:center;gap:8px;color:var(--ink);letter-spacing:.22em}
.pulse{width:6px;height:6px;background:var(--cyan);box-shadow:0 0 8px var(--cyan);animation:pulse 1s steps(2) infinite}
.stage.ready .pulse{background:var(--ok);box-shadow:0 0 8px var(--ok);animation:none}
.stage.authing .pulse{background:var(--warn);box-shadow:0 0 8px var(--warn);animation:pulse .5s steps(2) infinite}
.stage.pro .pulse{background:var(--ok);box-shadow:0 0 8px var(--ok);animation:none}
.stage.pro .ht{color:var(--ok)}
@keyframes pulse{50%{opacity:.25}}
.hs{margin-top:4px;letter-spacing:.06em}
.hs span{color:var(--text-2)}
.timer{font:500 13px/1 var(--display);letter-spacing:.04em;color:var(--mute);font-variant-numeric:tabular-nums}
.timer span{color:var(--ink)}
.ctrls{display:flex;gap:8px}
.ctrl{pointer-events:auto;font:500 11px/1 var(--mono);letter-spacing:.16em;color:var(--ink);background:transparent;border:1px solid var(--cyan-soft);padding:7px 12px;cursor:pointer;border-radius:0}
.ctrl:hover{background:var(--cyan-wash);border-color:var(--cyan)}
.ctrl:focus-visible{outline:2px solid var(--cyan);outline-offset:3px}
.ctrl:disabled{opacity:.45;cursor:default}
.snd{display:inline-flex;align-items:center;gap:8px}
.snd b{font-weight:600;color:var(--mute);min-width:3ch;text-align:left}
.snd[aria-pressed="true"] b{color:var(--ok)}
.eq{display:inline-flex;align-items:flex-end;gap:2px;height:10px}
.eq s{display:block;width:2px;height:10px;background:var(--mute);transform:scaleY(.2);transform-origin:bottom}
.snd[aria-pressed="true"] .eq s{background:var(--cyan)}
.snd.hint{animation:hint 1.4s ease-in-out infinite}
@keyframes hint{50%{border-color:var(--cyan);box-shadow:0 0 12px var(--cyan-soft)}}
.tele{margin:0;display:grid;grid-template-columns:repeat(2,auto);gap:4px 22px;text-align:right}
.tele div{display:flex;justify-content:flex-end;gap:10px}
.tele dt{color:var(--mute)}
.tele dd{margin:0;color:var(--ink);font-variant-numeric:tabular-nums;min-width:6ch}
.tele dd.deny{color:var(--warn)}
.tele dd.allow{color:var(--ok)}
.frame i{position:absolute;z-index:3;width:14px;height:14px;border:0 solid var(--cyan-soft);transition:border-color .5s}
.frame i:nth-child(1){top:calc(env(safe-area-inset-top,0px) + 10px);left:calc(env(safe-area-inset-left,0px) + 10px);border-top-width:1px;border-left-width:1px}
.frame i:nth-child(2){top:calc(env(safe-area-inset-top,0px) + 10px);right:calc(env(safe-area-inset-right,0px) + 10px);border-top-width:1px;border-right-width:1px}
.frame i:nth-child(3){bottom:calc(env(safe-area-inset-bottom,0px) + 10px);left:calc(env(safe-area-inset-left,0px) + 10px);border-bottom-width:1px;border-left-width:1px}
.frame i:nth-child(4){bottom:calc(env(safe-area-inset-bottom,0px) + 10px);right:calc(env(safe-area-inset-right,0px) + 10px);border-bottom-width:1px;border-right-width:1px}
.stage.pro .frame i{border-color:var(--ok-soft)}

.log{position:absolute;z-index:3;left:var(--gl);bottom:var(--gb);width:min(640px,calc(100% - var(--gl) - var(--gr)));
  font:400 clamp(10.5px,.92vw,12.5px)/1.7 var(--mono);color:var(--text-2);
  -webkit-mask-image:linear-gradient(to bottom,transparent 0,#000 42%);mask-image:linear-gradient(to bottom,transparent 0,#000 42%)}
.ln{white-space:pre;overflow:hidden;text-overflow:ellipsis}
.ln > span{display:inline-block;vertical-align:top}
.ts{width:10ch;margin-right:1ch;color:var(--mute)}
.tag{width:8ch;margin-right:1.2ch}
.tag.pend{color:var(--mute);animation:pulse .5s steps(2) infinite}
.tag.ok{color:var(--ok)}
.tag.warn{color:var(--warn)}
.tag.info{color:var(--cyan)}
.src{width:8ch;margin-right:1ch;color:var(--cyan)}
.msg{white-space:pre}
.ln.hl .msg{color:var(--ink);font-weight:600}
.ln.prompt{margin-top:2px;color:var(--ink)}
.ln.prompt > span{display:inline}
.pu{color:var(--ok)}.pd{color:var(--mute)}.ph{color:var(--cyan)}.pp{color:var(--text-2)}.pm{color:var(--ok)}
.ln.prompt > .cur{display:inline-block;width:.62em;height:1.1em;vertical-align:-.2em;background:var(--cyan);box-shadow:0 0 8px var(--cyan-soft);animation:blink 1.06s steps(1) infinite}
@keyframes blink{50%{opacity:0}}

@media (max-width:720px){ .br{display:none} }
@media (max-width:560px){
  .ts{display:none!important}
  .ln{white-space:normal}
  .hs{display:none}
  .alist li{grid-template-columns:8px minmax(0,1fr) auto}
  .alist .en{display:none}
  .op .chip{display:none}
  .wstats{display:grid;grid-template-columns:auto auto;gap:6px 0}
  .wstats div{border-left:0}
}
@media (prefers-reduced-motion:reduce){
  .stage.boot .screen,.stage.boot .flash,.logo.on,.pulse,.tag.pend,.ln.prompt > .cur,
  .auth.on,.auth.off,.welcome.on .wt,.alist li.run .ico,.auth.ok .ring::after,.snd.hint,.stage.exit .screen{animation:none!important}
  .core{transition:none}
  .stage.exit{opacity:0;transition:opacity .3s}
}
`;

/* tiny element builder: no innerHTML, so pages with Trusted Types still accept it */
function mk(tag, props) {
  const node = document.createElement(tag);
  if (props) for (const k in props) {
    const v = props[k];
    if (v == null) continue;
    if (k === 'class') node.className = v; else node.setAttribute(k, v);
  }
  for (let i = 2; i < arguments.length; i++) {
    const c = arguments[i];
    if (c == null) continue;
    if (Array.isArray(c)) c.forEach(x => node.append(typeof x === 'string' ? document.createTextNode(x) : x));
    else node.append(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return node;
}

let active = null;

function start(userOpts) {
  if (active) return active;
  const O = Object.assign({}, DEFAULTS, userOpts || {});
  const NAME = String(O.name), NAME_EN = String(O.nameEn).toUpperCase(), USER = String(O.user);
  const HOLD = Number.isFinite(Number(O.hold)) ? Math.max(300, Math.min(10000, Number(O.hold))) : 1400;
  const TITLES = Object.assign({}, DEFAULTS.authTitles, O.authTitles || {});

  /* ---------------- host + shadow DOM ---------------- */
  const host = document.createElement('div');
  host.setAttribute('data-codex-splash', '');
  // All options are local display content; these labels do not grant permissions.
  const theme = O.theme || {};
  const alpha = (hex, a) => {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`;
  };
  for (const [key, token] of Object.entries({accent:'cyan', background:'bg', foreground:'ink', success:'ok', warning:'warn'})) {
    const value = theme[key];
    if (typeof value !== 'string' || !/^#[0-9a-f]{6}$/i.test(value)) continue;
    host.style.setProperty('--' + token, value);
    if (key === 'accent') {
      host.style.setProperty('--cyan-soft', alpha(value, .42));
      host.style.setProperty('--cyan-wash', alpha(value, .08));
      host.style.setProperty('--line', alpha(value, .05));
    }
    if (key === 'success') {
      host.style.setProperty('--ok-soft', alpha(value, .45));
      host.style.setProperty('--ok-wash', alpha(value, .09));
    }
  }
  const hs = host.style;
  hs.position = 'fixed'; hs.top = '0'; hs.left = '0'; hs.right = '0'; hs.bottom = '0';
  hs.zIndex = String(O.zIndex); hs.display = 'block';
  const root = host.attachShadow({ mode: 'open' });
  let sheetOk = false;
  try {
    if ('adoptedStyleSheets' in root && typeof CSSStyleSheet === 'function') {
      const sheet = new CSSStyleSheet(); sheet.replaceSync(CSS); root.adoptedStyleSheets = [sheet]; sheetOk = true;
    }
  } catch (err) { sheetOk = false; }
  if (!sheetOk) { const st = document.createElement('style'); st.textContent = CSS; root.append(st); }

  const SEP = ' ';
  const stageEl = mk('div', { class: 'stage' },
    mk('div', { class: 'screen' },
      mk('div', { class: 'grid', 'aria-hidden': 'true' }),
      mk('canvas', { class: 'fx', 'data-k': 'fx', 'aria-hidden': 'true' }),
      mk('div', { class: 'core', 'data-k': 'core' },
        mk('div', { class: 'slot', 'data-k': 'slot' }, mk('canvas', { class: 'logo', 'data-k': 'logo', 'aria-hidden': 'true' })),
        mk('div', { class: 'sub', 'data-k': 'sub', 'aria-hidden': 'true' }, SEP),
        mk('div', { class: 'load', 'data-k': 'load', 'aria-hidden': 'true' },
          mk('div', { class: 'bar' }, mk('i', { class: 'fill', 'data-k': 'fill' }), mk('b', { class: 'head', 'data-k': 'head' })),
          mk('div', { class: 'meta' }, mk('span', { class: 'status', 'data-k': 'status' }, 'initializing'), mk('span', { class: 'pct', 'data-k': 'pct' }, '000%')))),
      mk('div', { class: 'deck' },
        mk('section', { class: 'auth', 'data-k': 'auth', 'aria-hidden': 'true' },
          mk('i'), mk('i'), mk('i'), mk('i'),
          mk('div', { class: 'ring' }, mk('canvas', { 'data-k': 'ring' })),
          mk('div', { class: 'ab' },
            mk('div', { class: 'ak', 'data-k': 'authK' }, SEP),
            mk('div', { class: 'at', 'data-k': 'authT' }, SEP),
            mk('div', { class: 'op' }, mk('span', null, String(O.operatorLabel)), mk('span', { class: 'val', 'data-k': 'opName' }, '— —'), mk('span', { class: 'chip', 'data-k': 'opChip' }, String(O.operatorBadge))),
            mk('ol', { class: 'alist', 'data-k': 'alist' }))),
        mk('section', { class: 'welcome', 'data-k': 'welcome' },
          mk('div', { class: 'wk', 'data-k': 'wK', 'aria-hidden': 'true' }, SEP),
          mk('h2', { class: 'wt' }, String(O.welcomePrefix), mk('span', { class: 'nm' }, NAME)),
          mk('div', { class: 'we', 'data-k': 'wE', 'aria-hidden': 'true' }, SEP),
          mk('div', { class: 'wline', 'aria-hidden': 'true' }),
          mk('div', { class: 'wmode', 'data-k': 'wMode' }, mk('span', { class: 'mchip' }, mk('i'), String(O.modeText)), mk('span', { class: 'men' }, String(O.modeEn))),
          mk('dl', { class: 'wstats', 'data-k': 'wStats' },
            O.stats.map(([a, b]) => mk('div', null, mk('dt', null, a), mk('dd', null, b)))))),
      mk('div', { class: 'hud tl', 'aria-hidden': 'true' },
        mk('div', { class: 'ht' }, mk('i', { class: 'pulse' }), mk('span', { 'data-k': 'ht' }, 'BOOT SEQUENCE')),
        mk('div', { class: 'hs' }, 'sess ', mk('span', { 'data-k': 'sess' }, '0000·0000'), ' · arm64 · sandboxed')),
      mk('div', { class: 'hud tr' },
        mk('div', { class: 'timer', 'aria-hidden': 'true' }, 'T+', mk('span', { 'data-k': 'timer' }, '00:00.000')),
        mk('div', { class: 'ctrls' },
          mk('button', { class: 'ctrl snd', 'data-k': 'snd', type: 'button', 'aria-pressed': 'false', 'aria-label': '音效开关' },
            mk('i', { class: 'eq', 'aria-hidden': 'true' }, mk('s'), mk('s'), mk('s'), mk('s'), mk('s')), '音效 ', mk('b', null, 'OFF')),
          mk('button', { class: 'ctrl', 'data-k': 'ctrl', type: 'button', 'aria-label': '跳过启动动画' }, '跳过'))),
      mk('div', { class: 'hud br', 'aria-hidden': 'true' },
        mk('dl', { class: 'tele' },
          mk('div', null, mk('dt', null, 'CPU'), mk('dd', { 'data-k': 'cpu' }, '00%')),
          mk('div', null, mk('dt', null, 'MEM'), mk('dd', { 'data-k': 'mem' }, '000 MB')),
          mk('div', null, mk('dt', null, 'THREADS'), mk('dd', { 'data-k': 'thr' }, '01')),
          mk('div', null, mk('dt', null, 'NET'), mk('dd', { class: 'deny', 'data-k': 'net' }, 'DENY')))),
      mk('div', { class: 'log', 'data-k': 'log', 'aria-hidden': 'true' }),
      mk('div', { class: 'frame', 'aria-hidden': 'true' }, mk('i'), mk('i'), mk('i'), mk('i')),
      mk('div', { class: 'scan', 'aria-hidden': 'true' }),
      mk('div', { class: 'flash', 'aria-hidden': 'true' })));
  root.append(stageEl);
  (document.documentElement || document.body).appendChild(host);

  const $ = k => root.querySelector('[data-k="' + k + '"]');
  const stage = stageEl, fx = $('fx'), g = fx.getContext('2d');
  const core = $('core'), slot = $('slot'), logo = $('logo'), lg = logo.getContext('2d');
  const subEl = $('sub'), loadEl = $('load'), fillEl = $('fill'), headEl = $('head'), pctEl = $('pct'), statusEl = $('status');
  const logEl = $('log'), timerEl = $('timer'), ctrl = $('ctrl'), sessEl = $('sess'), htEl = $('ht');
  const cpuEl = $('cpu'), memEl = $('mem'), thrEl = $('thr'), netEl = $('net');
  const authEl = $('auth'), ringC = $('ring'), rg = ringC.getContext('2d'), akEl = $('authK'), atEl = $('authT');
  const opEl = $('opName'), chipEl = $('opChip'), listEl = $('alist');
  const welEl = $('welcome'), wkEl = $('wK'), weEl = $('wE'), modeEl = $('wMode'), statsEl = $('wStats');
  const sndBtn = $('snd'), sndState = sndBtn.querySelector('b'), eqBars = Array.from(sndBtn.querySelectorAll('.eq s')), LV = new Float32Array(5);
  const REDUCE = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  const css = getComputedStyle(host);
  const tok = (n, f) => css.getPropertyValue(n).trim() || f;
  const COL = { cyan: tok('--cyan', '#3fd8ff'), ink: tok('--ink', '#e6f8ff'), hot: tok('--hot', '#ff3d7f'), ok: tok('--ok', '#5cf2b0') };
  function rgb(hx) { const m = hx.replace('#', ''); const v = parseInt(m.length === 3 ? m.split('').map(c => c + c).join('') : m, 16); return [(v >> 16) & 255, (v >> 8) & 255, v & 255]; }
  const [cr, cg, cb] = rgb(COL.cyan);
  const OKRGB = rgb(COL.ok);
  const CY = a => `rgba(${cr},${cg},${cb},${a})`;
  const LIT = [.22, .38, .56, .76, 1].map(CY);
  const DIM = [.1, .17, .26].map(a => `rgba(120,160,185,${a})`);
  const DUST = [0, 1, 2, 3, 4, 5, 6, 7].map(q => CY(Math.pow((q + 1) / 8, 2)));

  const WORD = Array.from(String(O.brand).toUpperCase()).slice(0, 16);
  const FONT = fs => `800 ${fs}px "Martian Mono", "JetBrains Mono", "IBM Plex Mono", Menlo, monospace`;
  const CORE_Y = .44;
  const T = { morph0: 2350, morphEnd: 3420, glitch0: 3360, glitch1: 3640, release: 3520, sub: 3800, load0: 3960, sweep: 4200, sweepDur: 760, ready: 5900 };
  const A = { in: 6200, mod: 6450, ver: 7250, ok: 8650, grant: 9150, out: 10450, wel: 10820, welE: 11150, mode: 11450, stats: 11650, prompt: 11800, final: 11950 };

  const clamp = (x, a = 0, b = 1) => x < a ? a : x > b ? b : x;
  const easeOut = x => 1 - Math.pow(1 - x, 3);
  const easeIO = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  const hex = n => Math.floor(Math.random() * Math.pow(16, n)).toString(16).padStart(n, '0');
  const fmtT = ms => { ms = Math.max(0, ms); const m = Math.floor(ms / 60000), s = Math.floor(ms / 1000) % 60, r = Math.floor(ms % 1000); return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0') + '.' + String(r).padStart(3, '0'); };

  /* ---------------- sound: synthesized live with Web Audio ---------------- */
  const SFX = (() => {
    const AC = window.AudioContext || window.webkitAudioContext;
    const api = { on: false, supported: !!AC };
    let ctx = null, master = null, verbIn = null, an = null, abuf = null, noiseBuf = null, drone = null, scan = null, started = false;
    const live = new Set(), voices = new Set();
    const now = () => ctx.currentTime;
    const running = () => !!ctx && ctx.state === 'running';
    function impulse(sec, decay) {
      const rate = ctx.sampleRate, len = Math.floor(rate * sec), buf = ctx.createBuffer(2, len, rate);
      for (let ch = 0; ch < 2; ch++) { const d = buf.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay); }
      return buf;
    }
    function init() {
      if (ctx) return true;
      if (!AC) return false;
      try { ctx = new AC(); } catch (err) { return false; }
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -16; comp.knee.value = 8; comp.ratio.value = 5; comp.attack.value = .003; comp.release.value = .2;
      master = ctx.createGain(); master.gain.value = 0;
      an = ctx.createAnalyser(); an.fftSize = 64; an.smoothingTimeConstant = .72; abuf = new Uint8Array(an.frequencyBinCount);
      master.connect(comp); comp.connect(an); an.connect(ctx.destination);
      const verb = ctx.createConvolver(); verb.buffer = impulse(2.6, 2.8);
      verbIn = ctx.createGain(); verbIn.gain.value = .5; verbIn.connect(verb); verb.connect(master);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const nd = noiseBuf.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
      return true;
    }
    function hold(p, t) { if (p.cancelAndHoldAtTime) p.cancelAndHoldAtTime(t); else { const v = p.value; p.cancelScheduledValues(t); p.setValueAtTime(v, t); } }
    function out(node, rev) { node.connect(master); if (rev) { const s = ctx.createGain(); s.gain.value = rev; node.connect(s); s.connect(verbIn); } }
    function track(n) { live.add(n); n.onended = () => live.delete(n); }
    function env(p, t, a, peak, d) { p.setValueAtTime(0, t); p.linearRampToValueAtTime(peak, t + a); p.exponentialRampToValueAtTime(.0001, t + a + d); }
    function tone(o) {
      const t = o.t != null ? o.t : now(), a = o.attack != null ? o.attack : .004;
      const os = ctx.createOscillator(); os.type = o.type || 'sine';
      os.frequency.setValueAtTime(o.f0, t); if (o.f1) os.frequency.exponentialRampToValueAtTime(o.f1, t + (o.glide != null ? o.glide : o.dur));
      const gn = ctx.createGain(); env(gn.gain, t, a, o.gain != null ? o.gain : .1, o.dur);
      let last = os; if (o.lp) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.lp; os.connect(f); last = f; }
      last.connect(gn); out(gn, o.rev || 0);
      os.start(t); os.stop(t + a + o.dur + .05); track(os);
    }
    function noise(o) {
      const t = o.t != null ? o.t : now(), a = o.attack != null ? o.attack : .005;
      const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
      const f = ctx.createBiquadFilter(); f.type = o.type || 'bandpass'; f.Q.value = o.q != null ? o.q : 1;
      f.frequency.setValueAtTime(o.f0, t); if (o.f1) f.frequency.exponentialRampToValueAtTime(o.f1, t + a + o.dur);
      const gn = ctx.createGain(); env(gn.gain, t, a, o.gain != null ? o.gain : .2, o.dur);
      s.connect(f); f.connect(gn); out(gn, o.rev || 0);
      s.start(t, Math.random() * .5); s.stop(t + a + o.dur + .05); track(s);
    }
    function makeVoice(gn, nodes) {
      const v = { stop(f = .3) { const t = now(); hold(gn.gain, t); gn.gain.linearRampToValueAtTime(0, t + f); nodes.forEach(n => { try { n.stop(t + f + .05); } catch (err) { /* already stopped */ } }); voices.delete(v); } };
      voices.add(v); return v;
    }
    function startDrone() {
      const t = now(), gn = ctx.createGain(); gn.gain.setValueAtTime(0, t); gn.gain.linearRampToValueAtTime(.07, t + 1.4);
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 300; lp.Q.value = 4;
      const lfo = ctx.createOscillator(); lfo.frequency.value = .17; const lfoG = ctx.createGain(); lfoG.gain.value = 120; lfo.connect(lfoG); lfoG.connect(lp.frequency);
      const oscs = [['sawtooth', 55, 0], ['sawtooth', 55, 9], ['sine', 110, 0]].map(([ty, f, dt]) => { const o = ctx.createOscillator(); o.type = ty; o.frequency.value = f; o.detune.value = dt; o.connect(lp); return o; });
      lp.connect(gn); out(gn, .2);
      const nodes = oscs.concat([lfo]); nodes.forEach(n => n.start(t));
      const v = makeVoice(gn, nodes); v.lp = lp; return v;
    }
    function startScan() {
      const t = now(), gn = ctx.createGain(); gn.gain.setValueAtTime(0, t); gn.gain.linearRampToValueAtTime(.05, t + .15);
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 10; bp.frequency.value = 1100;
      const lfo = ctx.createOscillator(); lfo.frequency.value = .955; const lfoG = ctx.createGain(); lfoG.gain.value = 700; lfo.connect(lfoG); lfoG.connect(bp.frequency);
      const am = ctx.createGain(); am.gain.value = .6;
      const trem = ctx.createOscillator(); trem.frequency.value = 14; const tg = ctx.createGain(); tg.gain.value = .4; trem.connect(tg); tg.connect(am.gain);
      const o1 = ctx.createOscillator(), o2 = ctx.createOscillator();
      o1.type = 'sawtooth'; o2.type = 'sawtooth'; o1.frequency.value = 165; o2.frequency.value = 165; o2.detune.value = 12;
      o1.connect(bp); o2.connect(bp); bp.connect(am); am.connect(gn); out(gn, .25);
      const nodes = [o1, o2, lfo, trem]; nodes.forEach(n => n.start(t));
      return makeVoice(gn, nodes);
    }
    function pad() {
      const t = now(), gn = ctx.createGain();
      gn.gain.setValueAtTime(0, t); gn.gain.linearRampToValueAtTime(.055, t + .9); gn.gain.setValueAtTime(.055, t + 3.2); gn.gain.exponentialRampToValueAtTime(.0001, t + 6.5);
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 1; lp.frequency.setValueAtTime(600, t); lp.frequency.exponentialRampToValueAtTime(2200, t + 2.5);
      [261.63, 329.63, 392, 493.88, 587.33].forEach(f => [-6, 6].forEach(dt => { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = dt; o.connect(lp); o.start(t); o.stop(t + 6.6); track(o); }));
      lp.connect(gn); out(gn, .6);
    }
    const cue = {
      power() { tone({ f0: 130, f1: 36, dur: .5, gain: .8, attack: .003 }); noise({ f0: 2200, q: .8, dur: .14, gain: .22 }); tone({ f0: 240, f1: 2600, dur: .6, gain: .035, attack: .25, rev: .4 }); },
      tick() { tone({ type: 'square', f0: 1700 + Math.random() * 900, dur: .018, gain: .022, attack: .001 }); },
      soft() { tone({ f0: 2400, dur: .03, gain: .02, attack: .001 }); },
      chirp() { const f = 1100 + Math.random() * 2600; tone({ f0: f, f1: f * (Math.random() < .5 ? 1.25 : .8), dur: .045, gain: .018, attack: .002, rev: .15 }); },
      chatter() { for (let k = 0; k < 7; k++) tone({ type: 'square', t: now() + k * .055 + Math.random() * .02, f0: 1400 + Math.random() * 1600, dur: .014, gain: .016, attack: .001 }); },
      riser() {
        const d = 1.05; noise({ f0: 300, f1: 5200, q: 3, dur: .15, attack: d, gain: .16, rev: .3 }); tone({ f0: 180, f1: 1400, glide: d, dur: .15, attack: d, gain: .04, rev: .3 });
        if (drone) { const p = drone.lp.frequency, t = now(); hold(p, t); p.linearRampToValueAtTime(1300, t + d); }
      },
      glitch() { for (let k = 0; k < 7; k++) tone({ type: 'square', t: now() + k * .034, f0: 150 + Math.random() * 2800, dur: .022, gain: .05, attack: .001 }); noise({ type: 'highpass', f0: 3000, dur: .2, gain: .06 }); },
      impact() {
        tone({ f0: 95, f1: 30, dur: 1.1, gain: .95, attack: .003 }); noise({ type: 'lowpass', f0: 1400, f1: 90, dur: .7, gain: .3 });
        [440, 880, 1318.5, 1760].forEach((f, i) => tone({ type: i ? 'sine' : 'triangle', f0: f, dur: 2.2, gain: i ? .045 : .06, attack: .004, rev: .55 }));
        if (drone) { const p = drone.lp.frequency, t = now(); hold(p, t); p.setTargetAtTime(300, t, .5); }
      },
      shimmer() { noise({ type: 'highpass', f0: 6500, dur: .6, attack: .3, gain: .07, rev: .5 }); tone({ f0: 2637, f1: 3520, dur: .6, attack: .25, gain: .018, rev: .5 }); },
      step(k) { tone({ f0: 900 + k * 90, dur: .03, gain: .02, attack: .001 }); },
      ready() { tone({ f0: 1046.5, dur: .09, gain: .07 }); tone({ t: now() + .11, f0: 1568, dur: .16, gain: .07, rev: .3 }); },
      whoosh() { noise({ f0: 180, f1: 1500, q: 1.2, dur: .25, attack: .35, gain: .09, rev: .3 }); },
      panel() { tone({ f0: 110, f1: 2600, dur: .2, gain: .05, attack: .005 }); noise({ type: 'highpass', f0: 4000, dur: .05, gain: .12 }); },
      handshake() { for (let k = 0; k < 16; k++) tone({ type: 'square', t: now() + k * .03, f0: k % 2 ? 2200 : 1200, dur: .026, gain: .016, attack: .001, lp: 3500 }); tone({ t: now() + .52, f0: 1800, f1: 2400, dur: .12, gain: .03 }); },
      scanStart() { if (scan) scan.stop(.05); scan = startScan(); },
      scanStop() { if (scan) { scan.stop(.08); scan = null; } },
      run() { tone({ f0: 3000, dur: .012, gain: .012, attack: .001 }); },
      pass(k) { const f = 880 * Math.pow(2, k * 2 / 12); tone({ f0: f, f1: f * 1.5, glide: .05, dur: .12, gain: .05, rev: .2 }); },
      verified() {
        [1046.5, 1318.5, 1568, 2093].forEach((f, i) => tone({ type: 'triangle', t: now() + i * .075, f0: f, dur: .9, gain: .06, rev: .5 }));
        tone({ f0: 70, f1: 42, dur: 1.3, gain: .55, attack: .02 }); noise({ type: 'lowpass', f0: 3500, f1: 160, dur: 1.1, gain: .18, attack: .01, rev: .3 });
      },
      unlock(k) { noise({ type: 'highpass', f0: 2600, dur: .035, gain: .22 }); tone({ type: 'square', f0: 240 * (1 + k * .12), f1: 140, dur: .07, gain: .035, lp: 1800 }); tone({ t: now() + .03, f0: 660 + k * 110, dur: .08, gain: .035 }); },
      panelOff() { tone({ f0: 2600, f1: 70, dur: .3, gain: .06 }); noise({ type: 'highpass', f0: 3000, dur: .04, gain: .14 }); },
      welcome() { cue.glitch(); const t = now() + .12; tone({ t, f0: 110, f1: 28, dur: 1.6, gain: 1, attack: .004 }); noise({ t, type: 'lowpass', f0: 1800, f1: 80, dur: 1, gain: .35 }); pad(); },
      chime() { [1568, 2093, 2637].forEach((f, i) => tone({ t: now() + i * .09, f0: f, dur: 1.4, gain: .04, rev: .6 })); },
      fadeDrone() { if (drone) { drone.stop(.6); drone = null; } },
      skip() { tone({ f0: 2400, f1: 300, dur: .18, gain: .05 }); },
    };
    api.state = () => ctx ? ctx.state : 'none';
    api.enable = cb => {
      if (!init()) return false;
      const t = now(); hold(master.gain, t); master.gain.linearRampToValueAtTime(.9, t + .08);
      api.on = true;
      const p = ctx.resume ? ctx.resume() : null;
      if (p && p.then) p.then(() => { if (api.on && running() && cb) cb(); }).catch(() => {});
      else if (running() && cb) cb();
      return true;
    };
    api.disable = () => {
      api.on = false; if (!ctx) return;
      const t = now(); hold(master.gain, t); master.gain.linearRampToValueAtTime(0, t + .15);
      setTimeout(() => { if (!api.on) api.reset(); }, 220);
    };
    api.reset = () => {
      if (!ctx) return;
      for (const n of live) { try { n.stop(); } catch (err) { /* already stopped */ } }
      live.clear();
      for (const v of Array.from(voices)) v.stop(.05);
      drone = null; scan = null;
    };
    api.start = () => { if (!api.on || !running() || started) return; started = true; api.reset(); cue.power(); drone = startDrone(); };
    api.ensureDrone = () => { if (api.on && running() && !drone) { started = true; drone = startDrone(); } };
    api.play = (name, ...a) => { if (api.on && running() && cue[name]) cue[name](...a); };
    api.levels = o => {
      if (!an) return; an.getByteFrequencyData(abuf);
      const B = [[0, 2], [2, 4], [4, 7], [7, 11], [11, 16]];
      for (let k = 0; k < 5; k++) { let s = 0; for (let i = B[k][0]; i < B[k][1]; i++) s += abuf[i]; o[k] = s / ((B[k][1] - B[k][0]) * 255); }
    };
    api.close = delay => { setTimeout(() => { try { api.reset(); if (ctx && ctx.close) ctx.close(); } catch (err) { /* ignore */ } }, delay || 0); };
    return api;
  })();
  /* timeline cues only sound when they fire on time, so a skip or a hidden window never dumps a pile of sounds at once */
  let curE = 0, lastStep = 0;
  function S(evT, name, ...a) { if (SFX.on && curE - evT <= 140) SFX.play(name, ...a); }

  /* ---------------- layout ---------------- */
  let W = 0, H = 0, DPR = 1, L = null, PAD = 40, RS = 0;
  function layout() {
    W = stage.clientWidth || window.innerWidth; H = stage.clientHeight || window.innerHeight; DPR = Math.min(2, window.devicePixelRatio || 1);
    fx.width = Math.round(W * DPR); fx.height = Math.round(H * DPR);
    lg.setTransform(1, 0, 0, 1, 0, 0);
    lg.font = FONT(100);
    const adv100 = (lg.measureText('M').width / 100) || .62;
    const k = 1.25 + .3 + WORD.length * adv100 + Math.max(0, WORD.length - 1) * .14;
    let fs = Math.min(112, H * .13, (W * .82) / k); fs = Math.max(22, fs);
    lg.font = FONT(fs);
    const capH = lg.measureText('C').actualBoundingBoxAscent || fs * .72;
    const m = fs * 1.25, gap = fs * .3, ls = fs * .14, adv = adv100 * fs;
    const w = m + gap + WORD.length * adv + Math.max(0, WORD.length - 1) * ls, hh = m;
    slot.style.width = w + 'px'; slot.style.height = hh + 'px';
    PAD = Math.ceil(fs * .45) + 10;
    logo.width = Math.round((w + PAD * 2) * DPR); logo.height = Math.round((hh + PAD * 2) * DPR);
    logo.style.width = (w + PAD * 2) + 'px'; logo.style.height = (hh + PAD * 2) + 'px';
    logo.style.left = (-PAD) + 'px'; logo.style.top = (-PAD) + 'px';
    const x = W / 2 - w / 2;
    const y = H * CORE_Y - core.offsetHeight / 2 + slot.offsetTop;
    L = { x, y, w, h: hh, fs, m, gap, ls, adv, capH, cx: x + w / 2, cy: y + hh / 2, R: Math.min(W * .42, H * .3, 320) };
    RS = ringC.parentElement.clientWidth || 140;
    ringC.width = Math.round(RS * DPR); ringC.height = Math.round(RS * DPR);
  }

  /* the mark: original glyph, two chevrons around an agent cursor */
  function drawLogoShape(c, ox, oy, mono, cursor) {
    const s = L.m / 64;
    c.save(); c.translate(ox, oy);
    c.save(); c.scale(s, s);
    c.lineWidth = 6.5; c.lineCap = 'square'; c.lineJoin = 'miter'; c.miterLimit = 10;
    c.strokeStyle = mono ? '#fff' : COL.cyan;
    c.beginPath(); c.moveTo(21, 15); c.lineTo(5, 32); c.lineTo(21, 49);
    c.moveTo(43, 15); c.lineTo(59, 32); c.lineTo(43, 49); c.stroke();
    if (cursor) { c.fillStyle = mono ? '#fff' : COL.ink; c.fillRect(27, 21, 10, 22); }
    c.restore();
    c.font = FONT(L.fs); c.textBaseline = 'alphabetic'; c.textAlign = 'left';
    const by = L.h / 2 + L.capH / 2, x0 = L.m + L.gap;
    if (mono) c.fillStyle = '#fff';
    else { const gr = c.createLinearGradient(0, by - L.capH, 0, by); gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, CY(1)); c.fillStyle = gr; }
    for (let i = 0; i < WORD.length; i++) c.fillText(WORD[i], x0 + i * (L.adv + L.ls), by);
    c.restore();
  }
  let cursorOn = true;
  function drawCrisp(sweepP) {
    const c = lg, w = L.w + PAD * 2, hh = L.h + PAD * 2;
    c.setTransform(DPR, 0, 0, DPR, 0, 0); c.clearRect(0, 0, w, hh);
    c.save(); c.shadowColor = CY(.6); c.shadowBlur = L.fs * .32 * DPR; drawLogoShape(c, PAD, PAD, false, cursorOn); c.restore();
    drawLogoShape(c, PAD, PAD, false, cursorOn);
    if (sweepP != null && sweepP >= 0 && sweepP <= 1) {
      c.save(); c.globalCompositeOperation = 'source-atop';
      const bx = PAD - 80 + (L.w + 160) * sweepP;
      const gr = c.createLinearGradient(bx - 46, 0, bx + 46, L.h * .5);
      gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(.5, 'rgba(255,255,255,.95)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = gr; c.fillRect(0, 0, w, hh); c.restore();
    }
  }

  /* ---------------- particles ---------------- */
  let N = 0, BX, BY, BZ, KIND, RA, RR, RANK, NN, TX, TY, DEL, SW, PX, PY, PZ, MT, LITAT, DX, DY, VX, VY, AMB, DRX, DRY;
  function build() {
    N = Math.round(clamp(W * H / 800, 700, 1900));
    const ringN = Math.round(N * .16), sphN = N - ringN;
    const F = () => new Float32Array(N);
    BX = F(); BY = F(); BZ = F(); RA = F(); RR = F(); RANK = F(); TX = F(); TY = F(); DEL = F(); SW = F(); PX = F(); PY = F(); PZ = F(); MT = F(); LITAT = F(); DX = F(); DY = F(); VX = F(); VY = F(); AMB = F(); DRX = F(); DRY = F();
    KIND = new Uint8Array(N); NN = new Int32Array(N).fill(-1);
    const ga = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < sphN; i++) {
      const y = 1 - (i + .5) / sphN * 2, r = Math.sqrt(1 - y * y), th = ga * i, j = 1 + (Math.random() - .5) * .06;
      BX[i] = Math.cos(th) * r * j; BY[i] = y * j; BZ[i] = Math.sin(th) * r * j;
      RANK[i] = (1 + y) / 2 * .85 + Math.random() * .15;
    }
    for (let i = sphN; i < N; i++) { KIND[i] = 1; RA[i] = (i - sphN) / ringN * Math.PI * 2 + Math.random() * .03; RR[i] = 1.5 + (Math.random() - .5) * .1; }
    for (let i = 0; i < sphN; i++) {
      let best = -1, bd = 1e9;
      for (let j = 0; j < sphN; j++) { if (j === i) continue; const dx = BX[i] - BX[j], dy = BY[i] - BY[j], dz = BZ[i] - BZ[j], d = dx * dx + dy * dy + dz * dz; if (d < bd) { bd = d; best = j; } }
      NN[i] = best;
    }
    for (let i = 0; i < N; i++) { SW[i] = (Math.random() - .5) * 110; AMB[i] = .05 + Math.random() * .26; DRX[i] = (Math.random() - .5) * .014; DRY[i] = (Math.random() - .5) * .012 - .004; }
  }
  function sampleTargets() {
    const ow = Math.ceil(L.w + 4), oh = Math.ceil(L.h + 4);
    const off = document.createElement('canvas'); off.width = ow; off.height = oh;
    const o = off.getContext('2d', { willReadFrequently: true });
    drawLogoShape(o, 2, 2, true, true);
    const d = o.getImageData(0, 0, ow, oh).data;
    const step = L.fs > 70 ? 2 : 1, pts = [];
    for (let y = 0; y < oh; y += step) for (let x = 0; x < ow; x += step) if (d[(y * ow + x) * 4 + 3] > 150) pts.push(x, y);
    const cnt = pts.length / 2;
    if (!cnt) { for (let i = 0; i < N; i++) { TX[i] = L.cx; TY[i] = L.cy; DEL[i] = Math.random() * .4; } return; }
    const idx = new Uint32Array(cnt); for (let i = 0; i < cnt; i++) idx[i] = i;
    for (let i = cnt - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; const t = idx[i]; idx[i] = idx[j]; idx[j] = t; }
    for (let i = 0; i < N; i++) {
      const k = idx[i % cnt], jit = i >= cnt ? 1.2 : 0;
      TX[i] = L.x - 2 + pts[2 * k] + (Math.random() - .5) * jit;
      TY[i] = L.y - 2 + pts[2 * k + 1] + (Math.random() - .5) * jit;
      DEL[i] = clamp((TX[i] - L.x) / L.w) * .32 + Math.random() * .1;
    }
  }
  let glitchOn = false;
  function drawField(e) {
    const c = g;
    const intro = easeOut(clamp((e - 80) / 1000)), R = L.R * (.5 + .5 * intro), ga = clamp((e - 60) / 450);
    const ay = .6 + e * .00052, ax = -.42 + Math.sin(e * .0005) * .05;
    const cay = Math.cos(ay), say = Math.sin(ay), cax = Math.cos(ax), sax = Math.sin(ax);
    const ra = e * .00075, crt = Math.cos(1.2), srt = Math.sin(1.2), crz = Math.cos(.34), srz = Math.sin(.34);
    const fov = 3.4, cx = L.cx, cy = L.cy;
    const litF = clamp((e - 380) / 1750);
    const mp = (e - T.morph0) / (T.morphEnd - T.morph0);
    for (let i = 0; i < N; i++) {
      let x, y, z;
      if (KIND[i] === 0) { x = BX[i] * cay - BZ[i] * say; const z1 = BX[i] * say + BZ[i] * cay; y = BY[i] * cax - z1 * sax; z = BY[i] * sax + z1 * cax; }
      else { const a = RA[i] + ra, r = RR[i], lx = Math.cos(a) * r, lz = Math.sin(a) * r, y1 = -lz * srt; z = lz * crt; x = lx * crz - y1 * srz; y = lx * srz + y1 * crz; }
      const p = fov / (fov + z);
      let sx = cx + x * R * p, sy = cy + y * R * p, t = 0;
      if (mp > 0) {
        t = clamp((mp - DEL[i]) / .5);
        if (t >= 1) { sx = TX[i] + Math.sin(e * .012 + i) * .35; sy = TY[i] + Math.cos(e * .011 + i * 1.3) * .35; }
        else if (t > 0) {
          const ee = easeIO(t), dx = TX[i] - sx, dy = TY[i] - sy, len = Math.hypot(dx, dy) || 1, arc = Math.sin(ee * Math.PI) * SW[i];
          sx += dx * ee - dy / len * arc; sy += dy * ee + dx / len * arc;
        }
      }
      PX[i] = sx; PY[i] = sy; PZ[i] = z; MT[i] = t;
      if (KIND[i] === 0 && LITAT[i] === 0 && RANK[i] < litF) LITAT[i] = e || 1;
    }
    const fade = 1 - clamp(mp * 1.6);
    if (fade > 0) {
      const gr = c.createRadialGradient(cx, cy, 0, cx, cy, R * 1.25);
      gr.addColorStop(0, CY(.12 * ga * fade)); gr.addColorStop(1, CY(0));
      c.fillStyle = gr; c.fillRect(cx - R * 1.3, cy - R * 1.3, R * 2.6, R * 2.6);
    }
    if (litF > 0 && litF < 1 && mp < 0) {
      const yf = clamp(2 * ((litF - .075) / .85) - 1, -1, 1), rl = Math.sqrt(1 - yf * yf);
      c.beginPath();
      for (let k = 0; k <= 72; k++) {
        const th = k / 72 * Math.PI * 2, x = Math.cos(th) * rl, z1 = Math.sin(th) * rl, y = yf * cax - z1 * sax, z = yf * sax + z1 * cax, p = fov / (fov + z);
        const sx = cx + x * R * p, sy = cy + y * R * p; if (k) c.lineTo(sx, sy); else c.moveTo(sx, sy);
      }
      c.strokeStyle = CY(.6 * ga); c.lineWidth = 1; c.stroke();
    }
    if (mp < .45) {
      const ea = ga * (1 - clamp(mp / .45)), front = new Path2D(), back = new Path2D(), orbit = new Path2D();
      let prev = false;
      for (let i = 0; i < N; i++) {
        if (KIND[i] === 1) { if (MT[i] > 0) { prev = false; continue; } if (prev) orbit.lineTo(PX[i], PY[i]); else orbit.moveTo(PX[i], PY[i]); prev = true; continue; }
        const j = NN[i]; if (j < 0 || !LITAT[i] || !LITAT[j]) continue;
        const pth = (PZ[i] + PZ[j]) < 0 ? front : back; pth.moveTo(PX[i], PY[i]); pth.lineTo(PX[j], PY[j]);
      }
      c.lineWidth = .8;
      c.strokeStyle = CY(.34 * ea); c.stroke(front);
      c.strokeStyle = CY(.1 * ea); c.stroke(back);
      c.strokeStyle = CY(.16 * ea); c.stroke(orbit);
    }
    const B = []; for (let k = 0; k < 10; k++) B.push(new Path2D());
    for (let i = 0; i < N; i++) {
      const depth = clamp((1 - PZ[i]) / 2); let b, s;
      if (MT[i] > .55) { b = 9; s = 1.5; }
      else if (KIND[i] === 1) { b = Math.min(4, (depth * 3 + 1) | 0); s = 1.3 * (.7 + depth * .6); }
      else if (LITAT[i]) { if (e - LITAT[i] < 240) { b = 8; s = 2.4; } else { b = Math.min(4, (depth * 5) | 0); s = 1.1 + depth * 1.1; } }
      else { b = 5 + Math.min(2, (depth * 3) | 0); s = .9 + depth * .6; }
      B[b].rect(PX[i] - s / 2, PY[i] - s / 2, s, s);
    }
    c.globalAlpha = ga;
    for (let k = 0; k < 5; k++) { c.fillStyle = LIT[k]; c.fill(B[k]); }
    for (let k = 0; k < 3; k++) { c.fillStyle = DIM[k]; c.fill(B[5 + k]); }
    c.fillStyle = '#ffffff'; c.fill(B[8]);
    if (glitchOn) { c.save(); c.globalCompositeOperation = 'lighter'; c.translate(-4, 0); c.fillStyle = COL.hot; c.fill(B[9]); c.translate(8, 0); c.fillStyle = COL.cyan; c.fill(B[9]); c.restore(); }
    c.fillStyle = COL.ink; c.fill(B[9]);
    c.globalAlpha = 1;
  }
  let released = false, releaseT = 0, boostT = -1e9;
  function release(t) {
    released = true; releaseT = t;
    for (let i = 0; i < N; i++) {
      DX[i] = PX[i]; DY[i] = PY[i];
      const a = Math.atan2(PY[i] - L.cy, PX[i] - L.cx) + (Math.random() - .5) * 1.1, sp = .06 + Math.random() * .42;
      VX[i] = Math.cos(a) * sp; VY[i] = Math.sin(a) * sp;
    }
  }
  function shock(t) {
    const r = ringC.getBoundingClientRect(), s = stage.getBoundingClientRect();
    const x = r.left - s.left + r.width / 2, y = r.top - s.top + r.height / 2, maxR = Math.max(W, H) * .65;
    for (let i = 0; i < N; i++) {
      const dx = DX[i] - x, dy = DY[i] - y, d = Math.hypot(dx, dy) || 1;
      if (d < maxR) { const k = (1 - d / maxR) * .95; VX[i] += dx / d * k; VY[i] += dy / d * k; }
    }
    boostT = t;
  }
  function drawDust(e, dt) {
    const c = g, f = Math.pow(.9955, dt), k = easeOut(clamp((e - releaseT) / 1200)), m = 12, sz = 1.1 + (1 - k) * .6;
    const boost = 1 + 2.4 * Math.exp(-Math.max(0, e - boostT) / 380);
    const B = []; for (let q = 0; q < 8; q++) B.push(new Path2D());
    for (let i = 0; i < N; i++) {
      VX[i] = VX[i] * f + DRX[i] * (1 - f); VY[i] = VY[i] * f + DRY[i] * (1 - f);
      DX[i] += VX[i] * dt; DY[i] += VY[i] * dt;
      if (DX[i] < -m) DX[i] += W + 2 * m; else if (DX[i] > W + m) DX[i] -= W + 2 * m;
      if (DY[i] < -m) DY[i] += H + 2 * m; else if (DY[i] > H + m) DY[i] -= H + 2 * m;
      const a = Math.min(1, (1 + (AMB[i] - 1) * k) * (.78 + .22 * Math.sin(e * .0021 + i)) * boost);
      const q = Math.min(7, Math.max(0, Math.round(Math.sqrt(a) * 8) - 1));
      B[q].rect(DX[i] - sz / 2, DY[i] - sz / 2, sz, sz);
    }
    for (let q = 0; q < 8; q++) { c.fillStyle = DUST[q]; c.fill(B[q]); }
  }
  function glitchSlices() {
    const c = g; c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
    const n = 3 + ((Math.random() * 5) | 0);
    for (let k = 0; k < n; k++) {
      const hh = ((3 + Math.random() * 24) * DPR) | 0, y = ((L.y - 24 + Math.random() * (L.h + 48)) * DPR) | 0, dx = ((Math.random() - .5) * 56 * DPR) | 0;
      if (y < 0 || y + hh > fx.height) continue;
      c.drawImage(fx, 0, y, fx.width, hh, dx, y, fx.width, hh);
    }
    c.restore();
  }
  function render(e, dt) {
    const c = g; c.setTransform(DPR, 0, 0, DPR, 0, 0);
    if (!released) {
      if (e > T.morph0) { c.globalCompositeOperation = 'destination-out'; c.fillStyle = 'rgba(0,0,0,.45)'; c.fillRect(0, 0, W, H); c.globalCompositeOperation = 'source-over'; }
      else c.clearRect(0, 0, W, H);
      drawField(e);
    } else { c.clearRect(0, 0, W, H); drawDust(e, dt); }
    if (glitchOn) glitchSlices();
  }

  /* ---------------- identity scanner ring ---------------- */
  const FP = [];
  for (let i = 0; i < 9; i++) {
    const r = .05 + i * .039; let a = Math.random() * Math.PI * 2; const segs = 2 + ((Math.random() * 2) | 0);
    for (let s = 0; s < segs; s++) { const len = .6 + Math.random() * 1.5; FP.push({ r, a0: a, a1: a + len, i }); a += len + .25 + Math.random() * .5; }
  }
  function drawLock(c, cx, cy, ir, stroke) {
    const w = ir * .78, hh = ir * .6, x = cx - w / 2, y = cy - hh * .15;
    c.strokeStyle = stroke; c.lineWidth = Math.max(1.5, ir * .07); c.lineCap = 'butt';
    c.beginPath(); c.moveTo(cx - w * .3, y); c.lineTo(cx - w * .3, y - hh * .25); c.arc(cx, y - hh * .25, w * .3, Math.PI, 0); c.lineTo(cx + w * .3, y); c.stroke();
    c.strokeRect(x, y, w, hh);
    c.fillStyle = stroke; c.fillRect(cx - 1.5, y + hh * .32, 3, hh * .34);
  }
  function drawRing(e) {
    if (!RS) return;
    const c = rg, Sz = RS, cx = Sz / 2, cy = Sz / 2, R = Sz / 2 - 3;
    c.setTransform(DPR, 0, 0, DPR, 0, 0); c.clearRect(0, 0, Sz, Sz);
    const ok = e >= A.ok, verify = e >= A.ver && !ok;
    const [r, gg, b] = ok ? OKRGB : [cr, cg, cb];
    const col = a => `rgba(${r},${gg},${b},${a})`;
    const ap = easeOut(clamp((e - A.mod) / 600));
    c.lineCap = 'butt';
    const rot = e * .00022;
    c.beginPath();
    for (let k = 0; k < 72; k++) { const a = k / 72 * Math.PI * 2 + rot, r0 = R * (k % 6 === 0 ? .86 : .91); c.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); c.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); }
    c.strokeStyle = col(.45 * ap); c.lineWidth = 1; c.stroke();
    for (const [rr, len, sp, w] of [[.79, 1.3, .0017, 2.2], [.735, .55, -.0026, 1.2], [.69, 2.4, .0008, 1]]) {
      const a = e * sp * (verify ? 1.9 : 1); c.beginPath(); c.arc(cx, cy, R * rr, a, a + len * ap); c.strokeStyle = col(.85); c.lineWidth = w; c.stroke();
    }
    c.beginPath(); c.arc(cx, cy, R * .62, 0, Math.PI * 2); c.strokeStyle = col(.18); c.lineWidth = 1; c.stroke();
    c.beginPath();
    for (let k = 0; k < 64; k++) {
      const a = k / 64 * Math.PI * 2 - Math.PI / 2;
      const amp = verify ? .25 + .75 * Math.abs(Math.sin(e * .011 + k * 1.7) * Math.sin(e * .0067 + k * .63)) : ok ? .35 + .15 * Math.sin(e * .004 + k * .4) : .12;
      const r0 = R * .5, r1 = r0 + R * .1 * amp * ap;
      c.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); c.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
    }
    c.strokeStyle = col(.7); c.lineWidth = 1.4; c.stroke();
    if (!ok) {
      const a = e * .0034;
      for (let s = 0; s < 10; s++) { c.beginPath(); c.moveTo(cx, cy); c.arc(cx, cy, R * .62, a - (s + 1) * .07, a - s * .07); c.closePath(); c.fillStyle = col(.11 * (1 - s / 10) * ap); c.fill(); }
    }
    const ir = R * .42;
    if (e < A.ver) drawLock(c, cx, cy, ir, col(.95 * ap));
    else if (!ok) {
      const vp = clamp((e - A.ver) / (A.ok - A.ver - 150));
      c.lineWidth = 1.3;
      for (const f of FP) { c.beginPath(); c.ellipse(cx, cy, R * f.r, R * f.r * 1.15, 0, f.a0, f.a1); c.strokeStyle = f.i / 8 <= vp ? col(.95) : 'rgba(120,160,185,.28)'; c.stroke(); }
      const sy = cy + Math.sin(e * .006) * ir * .95;
      c.save(); c.beginPath(); c.arc(cx, cy, ir, 0, Math.PI * 2); c.clip();
      const gr = c.createLinearGradient(0, sy - 14, 0, sy + 1); gr.addColorStop(0, col(0)); gr.addColorStop(1, col(.5));
      c.fillStyle = gr; c.fillRect(cx - ir, sy - 14, ir * 2, 15); c.fillStyle = col(1); c.fillRect(cx - ir, sy, ir * 2, 1.2);
      c.restore();
    } else {
      const p = easeOut(clamp((e - A.ok) / 420));
      c.beginPath(); c.arc(cx, cy, ir * .95, 0, Math.PI * 2); c.fillStyle = col(.08); c.fill();
      const P = [[-.42, .02], [-.12, .32], [.44, -.3]], L1 = Math.hypot(.3, .3), L2 = Math.hypot(.56, .62), d = p * (L1 + L2);
      c.save(); c.beginPath(); c.moveTo(cx + P[0][0] * ir, cy + P[0][1] * ir);
      if (d <= L1) { const u = d / L1; c.lineTo(cx + (P[0][0] + (P[1][0] - P[0][0]) * u) * ir, cy + (P[0][1] + (P[1][1] - P[0][1]) * u) * ir); }
      else { c.lineTo(cx + P[1][0] * ir, cy + P[1][1] * ir); const u = (d - L1) / L2; c.lineTo(cx + (P[1][0] + (P[2][0] - P[1][0]) * u) * ir, cy + (P[1][1] + (P[2][1] - P[1][1]) * u) * ir); }
      c.strokeStyle = col(1); c.lineWidth = Math.max(2.5, R * .05); c.lineCap = 'square'; c.lineJoin = 'miter';
      c.shadowColor = col(.8); c.shadowBlur = 12 * DPR; c.stroke(); c.restore();
    }
  }
  const CHECKS = O.checks;
  const PERMS = O.permissions;
  function setRows(defs, st) {
    listEl.textContent = '';
    for (const [nm, en] of defs) listEl.append(mk('li', { class: 'pend' }, mk('span', { class: 'ico' }), mk('span', { class: 'nm' }, nm), mk('span', { class: 'en' }, en), mk('span', { class: 'st' }, st)));
  }
  function rowState(k, cls, st) { const li = listEl.children[k]; if (!li) return; li.className = cls; li.querySelector('.st').textContent = st; }

  /* ---------------- boot log ---------------- */
  const LOG = [
    { t: 300, src: 'boot', tag: 'INFO', msg: 'codex desktop · boot sequence' },
    { t: 480, src: 'sandbox', tag: 'OK', msg: 'profile applied · network: deny' },
    { t: 660, src: 'vfs', tag: 'OK', msg: 'mount ~/project → /workspace (rw)' },
    { t: 840, src: 'index', tag: 'OK', msg: 'walking repository tree · {n} files', count: { to: 12847, t0: 880, t1: 2000 } },
    { t: 1180, src: 'ast', tag: 'OK', msg: '41 grammars loaded · 2.38M symbols' },
    { t: 1400, src: 'cache', tag: 'WARN', msg: 'embedding shard 3/16 stale · rebuilt' },
    { t: 1600, src: 'graph', tag: 'OK', msg: 'call edges resolved · 9.42M' },
    { t: 1820, src: 'model', tag: 'OK', msg: 'reasoning engine attached · ctx 1M' },
    { t: 2040, src: 'agents', tag: 'OK', msg: 'worker pool ×8 warm' },
    { t: 2260, src: 'tools', tag: 'OK', msg: 'shell · git · apply_patch · test' },
    { t: 2480, src: 'crypto', tag: 'OK', msg: 'ed25519 build signature valid' },
    { t: 2700, src: 'mcp', tag: 'OK', msg: '3 servers handshaked · 0 errors' },
    { t: 4300, src: 'session', tag: 'OK', msg: '14 threads restored' },
    { t: 4900, src: 'lsp', tag: 'OK', msg: 'ts · rust · python · go online' },
    { t: 5400, src: 'policy', tag: 'OK', msg: 'approval mode: on-request' },
    { t: 5900, src: 'codex', tag: 'OK', msg: 'runtime ready in {r}s', hl: true },
    { t: 6250, src: 'auth', tag: 'INFO', msg: 'access request → secure enclave' },
    { t: 6950, src: 'auth', tag: 'OK', msg: 'challenge signed · nonce 9c41e7a0' },
    { t: 7350, src: 'auth', tag: 'OK', msg: 'identity scan · 5 factors', until: 8560 },
    { t: 8650, src: 'auth', tag: 'OK', msg: 'operator verified · ' + NAME + ' · root/L5', hl: true },
    { t: 9200, src: 'policy', tag: 'OK', msg: 'scopes granted · fs exec net git agents', until: 9960 },
    { t: 10000, src: 'policy', tag: 'OK', msg: 'approval mode → full-auto' },
    { t: 11450, src: 'mode', tag: 'OK', msg: 'professional workspace engaged', hl: true },
  ];
  if (Array.isArray(O.logMessages)) {
    LOG.forEach((item, index) => {
      if (typeof O.logMessages[index] === 'string') item.msg = O.logMessages[index].replaceAll('{name}', NAME);
    });
  }
  const TAGTXT = { OK: '[  OK  ]', WARN: '[ WARN ]', INFO: '[ INFO ]' };
  const maxLines = () => H < 560 ? 3 : H < 760 ? 5 : (W < 560 ? 6 : 8);
  let lines = [], readyMs = T.ready, finalMs = A.final;
  function trimLog() { while (logEl.children.length > maxLines()) logEl.firstElementChild.remove(); }
  function pushLine(d) {
    const tt = d.t === T.ready ? readyMs : d.t + Math.random() * 24;
    const ts = mk('span', { class: 'ts' }, '[' + (tt / 1000).toFixed(4).padStart(8, ' ') + ']');
    const tag = mk('span', { class: 'tag pend' }, '[ ···· ]');
    const msg = mk('span', { class: 'msg' });
    logEl.append(mk('div', { class: 'ln' + (d.hl ? ' hl' : '') }, ts, tag, mk('span', { class: 'src' }, d.src), msg));
    trimLog();
    lines.push({ d, msg, tag, done: false });
    S(d.t, 'tick');
  }
  function updateLog(e) {
    for (const ln of lines) {
      if (ln.done) continue;
      const d = ln.d; let text = d.msg, countDone = true;
      if (d.count) { const p = clamp((e - d.count.t0) / (d.count.t1 - d.count.t0)); text = text.replace('{n}', Math.round(d.count.to * easeOut(p)).toLocaleString('en-US')); countDone = p >= 1; }
      text = text.replace('{r}', (readyMs / 1000).toFixed(2));
      const n = Math.floor((e - d.t) / 6);
      ln.msg.textContent = text.slice(0, n);
      if (n >= text.length && countDone && (!d.until || e >= d.until)) { ln.msg.textContent = text; ln.tag.className = 'tag ' + d.tag.toLowerCase(); ln.tag.textContent = TAGTXT[d.tag]; ln.done = true; }
    }
  }
  function pushPrompt() {
    logEl.append(mk('div', { class: 'ln prompt' },
      mk('span', { class: 'pu' }, USER), mk('span', { class: 'pd' }, '@'), mk('span', { class: 'ph' }, String(O.promptHost)), ' ',
      mk('span', { class: 'pp' }, String(O.promptPath)), ' ', mk('span', { class: 'pm' }, String(O.promptMode)), ' ', mk('span', { class: 'ps' }, '$'), ' ', mk('span', { class: 'cur' })));
    trimLog();
    S(A.prompt, 'chatter');
  }

  /* ---------------- text decode ---------------- */
  const GLYPH = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#$%&*+=<>/\\';
  const GLYPH_CN = '验证访问权限系统密钥数据节点通道协议加密授权身份核心终端指令模块矩阵量子信道';
  const KEEP = ' ·,，/';
  let decodes = [];
  function decode(node, text, e0, dur, set) {
    for (const d of decodes) if (d.el === node) d.done = true;
    decodes.push({ el: node, text, e0, dur, set: set || GLYPH, done: false });
  }
  function updateDecodes(e) {
    for (const d of decodes) {
      if (d.done) continue;
      const p = clamp((e - d.e0) / d.dur), n = Math.floor(p * d.text.length);
      let s = d.text.slice(0, n);
      for (let i = n; i < d.text.length; i++) { const ch = d.text[i]; s += KEEP.includes(ch) ? ch : d.set[(Math.random() * d.set.length) | 0]; }
      d.el.textContent = s;
      if (p >= 1) { d.el.textContent = d.text; d.done = true; }
    }
  }
  function setAuthTitle(cn, en, t) { decode(atEl, cn, t, 420, GLYPH_CN); decode(akEl, en, t, 420); }

  /* ---------------- load bar + HUD ---------------- */
  const PK = [[0, 0], [.12, .18], [.24, .24], [.4, .52], [.55, .58], [.72, .83], [.86, .9], [1, 1]];
  function curve(x) { x = clamp(x); for (let i = 1; i < PK.length; i++) { if (x <= PK[i][0]) { const [x0, y0] = PK[i - 1], [x1, y1] = PK[i], u = (x - x0) / (x1 - x0); return y0 + (y1 - y0) * (u * u * (3 - 2 * u)); } } return 1; }
  let loadDone = false;
  function updateLoad(e) {
    if (e < T.load0 || loadDone) return;
    const x = (e - T.load0) / (T.ready - T.load0), p = x >= 1 ? 1 : curve(x);
    fillEl.style.width = (p * 100).toFixed(2) + '%'; headEl.style.left = (p * 100).toFixed(2) + '%';
    pctEl.textContent = String(Math.floor(p * 100)).padStart(3, '0') + '%';
    statusEl.textContent = p >= 1 ? 'awaiting authorization' : p < .25 ? 'mounting workspace' : p < .55 ? 'warming model cache' : p < .8 ? 'restoring session' : 'linking toolchain';
    const st = Math.floor(p * 10);
    if (st > lastStep) { if (st - lastStep === 1 && st < 10) S(e, 'step', st); lastStep = st; }
    if (p >= 1) loadDone = true;
  }
  let lastHud = 0, readyT = null, doneT = null;
  function updateHud(e, now) {
    if (doneT != null || now - lastHud < 66) return;
    lastHud = now;
    timerEl.textContent = fmtT(e);
    const hi = e < 2800 ? 72 : e < A.ver ? 30 : e < A.ok ? 60 : 22;
    cpuEl.textContent = String(Math.round(14 + Math.random() * hi)).padStart(2, '0') + '%';
    memEl.textContent = Math.round(96 + clamp(e / T.ready) * 414 + (e > A.grant ? 96 : 0) + Math.random() * 8) + ' MB';
    thrEl.textContent = e > 2040 ? '08' : e > 1180 ? '04' : '01';
  }
  function onRuntimeReady() { readyT = T.ready; stage.classList.add('ready'); htEl.textContent = 'SYSTEM ONLINE'; }
  function onFinal() {
    doneT = A.final; stage.classList.add('done');
    timerEl.textContent = fmtT(finalMs);
    cpuEl.textContent = '06%'; memEl.textContent = '624 MB'; thrEl.textContent = '08';
  }

  /* ---------------- timeline ---------------- */
  let events = [], evIdx = 0, sweepStart = -1, t0 = 0, last = 0, raf = 0, sessStr = '', exiting = false, destroyed = false;
  function buildEvents() {
    const ev = LOG.map(d => ({ t: d.t, fn: () => pushLine(d) }));
    ev.push({ t: T.morph0, fn: () => S(T.morph0, 'riser') });
    ev.push({ t: T.glitch0, fn: () => { glitchOn = true; S(T.glitch0, 'glitch'); } });
    ev.push({ t: T.release, fn: () => { release(T.release); logo.classList.add('on'); S(T.release, 'impact'); } });
    ev.push({ t: T.glitch1, fn: () => { glitchOn = false; } });
    ev.push({ t: T.sub, fn: () => { subEl.classList.add('on'); decode(subEl, String(O.subtitle), T.sub, 700); S(T.sub, 'chatter'); } });
    ev.push({ t: T.load0, fn: () => loadEl.classList.add('on') });
    ev.push({ t: T.sweep, fn: () => { sweepStart = T.sweep; S(T.sweep, 'shimmer'); } });
    ev.push({ t: T.ready + 1, fn: () => { onRuntimeReady(); S(T.ready + 1, 'ready'); } });
    ev.push({ t: A.in, fn: () => { core.classList.add('up'); loadEl.classList.add('gone'); stage.classList.add('authing'); htEl.textContent = 'AUTHENTICATING'; S(A.in, 'whoosh'); } });
    ev.push({ t: A.mod, fn: () => { authEl.classList.add('on'); setAuthTitle(...TITLES.request, A.mod); S(A.mod, 'panel'); } });
    ev.push({ t: A.mod + 220, fn: () => S(A.mod + 220, 'handshake') });
    ev.push({ t: A.ver, fn: () => { setAuthTitle(...TITLES.verify, A.ver); decode(opEl, NAME, A.ver + 60, 1050, /[㐀-鿿]/.test(NAME) ? GLYPH_CN : GLYPH); S(A.ver, 'scanStart'); } });
    CHECKS.forEach((_, k) => {
      const td = A.ver + 230 + k * 265;
      ev.push({ t: td - 230, fn: () => { rowState(k, 'run', '扫描中'); S(td - 230, 'run'); } });
      ev.push({ t: td, fn: () => { rowState(k, 'ok', '通过'); S(td, 'pass', k); } });
    });
    ev.push({ t: A.ver + 1110, fn: () => S(A.ver + 1110, 'chatter') });
    ev.push({ t: A.ok, fn: () => { authEl.classList.add('ok'); chipEl.classList.add('on'); setAuthTitle(...TITLES.success, A.ok); htEl.textContent = 'ACCESS VERIFIED'; shock(A.ok); SFX.play('scanStop'); S(A.ok, 'verified'); } });
    ev.push({ t: A.grant, fn: () => { setAuthTitle(...TITLES.grant, A.grant); setRows(PERMS, '锁定'); S(A.grant, 'soft'); } });
    PERMS.forEach((_, k) => {
      const tu = A.grant + 160 + k * 170;
      ev.push({ t: tu, fn: () => { rowState(k, 'ok', '已开放'); if (k === 2) { netEl.textContent = 'OPEN'; netEl.className = 'allow'; } S(tu, 'unlock', k); } });
    });
    ev.push({ t: A.out, fn: () => { authEl.classList.add('off'); S(A.out, 'panelOff'); } });
    ev.push({ t: A.wel, fn: () => { authEl.classList.add('gone'); welEl.classList.add('on'); decode(wkEl, String(O.welcomeBadge) + sessStr, A.wel, 600); S(A.wel, 'welcome'); } });
    ev.push({ t: A.welE, fn: () => { decode(weEl, String(O.welcomeEnPrefix) + NAME_EN, A.welE, 650); S(A.welE, 'chatter'); } });
    ev.push({ t: A.mode, fn: () => { modeEl.classList.add('on'); stage.classList.remove('authing'); stage.classList.add('pro'); htEl.textContent = 'PRO MODE · ' + NAME; S(A.mode, 'chime'); } });
    ev.push({ t: A.stats, fn: () => statsEl.classList.add('on') });
    ev.push({ t: A.prompt, fn: pushPrompt });
    ev.push({ t: A.final, fn: onFinal });
    ev.push({ t: A.final + HOLD, fn: exit });
    return ev.sort((a, b) => a.t - b.t);
  }
  function updateLogo(e) {
    if (sweepStart >= 0) {
      const p = (e - sweepStart) / T.sweepDur;
      if (p <= 1) drawCrisp(easeIO(clamp(p))); else { sweepStart = -1; drawCrisp(); }
    }
    if (readyT != null && !REDUCE) {
      const on = Math.floor((e - readyT) / 530) % 2 === 0;
      if (on !== cursorOn) { cursorOn = on; if (sweepStart < 0) drawCrisp(); }
    }
  }
  function frame(now) {
    if (destroyed) return;
    raf = requestAnimationFrame(frame);
    const e = now - t0, dt = Math.min(50, Math.max(0, now - last)); last = now;
    curE = e;
    while (evIdx < events.length && events[evIdx].t <= e) events[evIdx++].fn();
    if (destroyed) return;
    updateLog(e); updateDecodes(e); updateLoad(e); updateHud(e, now);
    render(e, dt); updateLogo(e);
    if (e >= A.mod - 50 && e < A.out + 420) drawRing(e);
    if (SFX.on && SFX.state() === 'running') {
      if (e > 420 && e < 2150 && Math.random() < dt / 65) SFX.play('chirp');
      SFX.levels(LV);
      for (let k = 0; k < 5; k++) eqBars[k].style.transform = 'scaleY(' + (.15 + .85 * LV[k]).toFixed(3) + ')';
    }
  }

  function play() {
    readyMs = T.ready + Math.round(Math.random() * 60);
    finalMs = A.final + Math.round(Math.random() * 60);
    sessStr = hex(4) + '·' + hex(4); sessEl.textContent = sessStr;
    setRows(CHECKS, '等待');
    events = buildEvents(); evIdx = 0;
    drawCrisp();
    stage.classList.add('boot');
    t0 = last = performance.now();
    if (REDUCE) { finishStatic(); return; }
    SFX.start();
    raf = requestAnimationFrame(frame);
  }
  function skip() {
    if (REDUCE || exiting) return;
    if (doneT != null) { exit(); return; }
    t0 = performance.now() - (A.final + Math.max(60, HOLD - 600));
    if (SFX.on) { SFX.reset(); SFX.play('skip'); }
  }
  function exit() {
    if (exiting) return;
    exiting = true;
    stage.classList.add('exit');
    SFX.play('panelOff'); SFX.play('fadeDrone');
    setTimeout(destroy, REDUCE ? 340 : 720);
  }
  function destroy() {
    if (destroyed) return;
    destroyed = true;
    cancelAnimationFrame(raf); cancelAnimationFrame(rzRaf);
    window.removeEventListener('keydown', onKey, true);
    window.removeEventListener('resize', onResize);
    document.removeEventListener('visibilitychange', onVis);
    SFX.close(900);
    host.remove();
    active = null;
    if (typeof O.onDone === 'function') { try { O.onDone(); } catch (err) { /* ignore */ } }
  }

  /* reduced motion: show the finished screen without movement, then leave */
  const STATIC_E = A.final + 5000;
  function finishStatic() {
    for (let i = 0; i < N; i++) { PX[i] = Math.random() * W; PY[i] = Math.random() * H; }
    curE = STATIC_E;
    for (const ev of events) if (ev.fn !== exit) ev.fn();
    evIdx = events.length; sweepStart = -1; boostT = -1e9;
    updateLog(STATIC_E); updateDecodes(STATIC_E); updateLoad(STATIC_E);
    drawCrisp(); redrawStatic();
    setTimeout(exit, HOLD + 1600);
  }
  function redrawStatic() {
    if (!released) return;
    g.setTransform(DPR, 0, 0, DPR, 0, 0); g.clearRect(0, 0, W, H); drawDust(STATIC_E, 0);
  }

  /* ---------------- controls ---------------- */
  function setSnd(on) {
    sndBtn.setAttribute('aria-pressed', on ? 'true' : 'false'); sndState.textContent = on ? 'ON' : 'OFF';
    if (!on) eqBars.forEach(b => { b.style.transform = ''; });
  }
  ctrl.addEventListener('click', skip);
  if (!SFX.supported) { sndBtn.disabled = true; sndState.textContent = 'N/A'; }
  sndBtn.addEventListener('click', () => {
    sndBtn.classList.remove('hint');
    if (!SFX.on) {
      if (!SFX.enable(() => { if (curE < 400) SFX.start(); else if (curE < A.final) SFX.ensureDrone(); })) { sndBtn.disabled = true; sndState.textContent = 'N/A'; return; }
      setSnd(true);
    } else { SFX.disable(); setSnd(false); }
  });
  const onKey = ev => { if (ev.key === 'Escape') { ev.stopPropagation(); skip(); } };
  window.addEventListener('keydown', onKey, true);
  let rzRaf = 0;
  const onResize = () => {
    cancelAnimationFrame(rzRaf);
    rzRaf = requestAnimationFrame(() => { if (destroyed) return; layout(); sampleTargets(); drawCrisp(); if (REDUCE) redrawStatic(); });
  };
  window.addEventListener('resize', onResize);

  /* ---------------- go ---------------- */
  let begun = false;
  function begin() {
    if (begun || destroyed) return;
    begun = true;
    layout(); build(); sampleTargets();
    if (O.sound && SFX.supported) {
      SFX.enable(() => { if (curE < 400) SFX.start(); else if (curE < A.final) SFX.ensureDrone(); });
      setSnd(true);
      setTimeout(() => { if (!destroyed && SFX.state() !== 'running') { SFX.on = false; setSnd(false); sndBtn.classList.add('hint'); } }, 450);
    } else if (SFX.supported) sndBtn.classList.add('hint');
    play();
    const fontsReady = (document.fonts && document.fonts.load)
      ? Promise.race([document.fonts.load(FONT(64)).catch(() => {}), new Promise(r => setTimeout(r, 1500))])
      : Promise.resolve();
    fontsReady.then(() => { if (destroyed) return; layout(); sampleTargets(); drawCrisp(); if (REDUCE) redrawStatic(); });
  }
  const onVis = () => { if (document.visibilityState !== 'hidden') { document.removeEventListener('visibilitychange', onVis); begin(); } };
  if (document.visibilityState === 'hidden') document.addEventListener('visibilitychange', onVis);
  else begin();

  active = { skip, stop: destroy };
  return active;
}

global.CodexSplash = { start, version: '1.0.0' };
})(typeof window !== 'undefined' ? window : this);
