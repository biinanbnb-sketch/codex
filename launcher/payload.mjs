import {readFile} from 'node:fs/promises';

export async function buildInjection(resources) {
  const [source, configText] = await Promise.all([
    readFile(new URL('codex-splash.js', resources), 'utf8'),
    readFile(new URL('splash.config.json', resources), 'utf8')
  ]);
  const config = JSON.parse(configText);
  return `(() => {
    if (window !== window.top || !document.body || innerWidth < 480 || innerHeight < 360)
      return {installed:false};
    if (window.__codexSplashState) return {installed:true};
    const priorFocus = document.activeElement, previousAPI = window.CodexSplash;
    const state = window.__codexSplashState = {phase:'loading'};
    let timer, player, cleaned = false;
    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      clearTimeout(timer);
      if (previousAPI === undefined) delete window.CodexSplash;
      else window.CodexSplash = previousAPI;
      if (priorFocus?.isConnected) priorFocus.focus({preventScroll:true});
      setTimeout(() => { if (window.__codexSplashState === state) delete window.__codexSplashState; }, 15000);
    };
    try {
      ${source}
      player = window.CodexSplash.start(Object.assign(${JSON.stringify(config)}, {
        onDone() { if (state.phase !== 'timeout') state.phase = 'complete'; cleanup(); }
      }));
      state.phase = 'playing';
      timer = setTimeout(() => { state.phase = 'timeout'; player?.stop(); cleanup(); }, ${Math.max(22000,15000 + config.hold)});
      return {installed:true};
    } catch (error) {
      document.querySelector('[data-codex-splash]')?.remove();
      state.phase = 'failed'; cleanup();
      return {installed:false, error:String(error.message)};
    }
  })()`;
}
