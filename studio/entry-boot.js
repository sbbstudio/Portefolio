/* One entrance for fonts, model download, decoding and the first rendered scene. */
(() => {
  if (location.hash) return;
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let released = false, finishing = false, frame = 0, leaveTimer = 0, releaseTimer = 0;
  let fontsReady = false, phase = 'loading', modelProgress = 0;
  root.dataset.entry = 'loading';
  // Start the largest asset while the browser parses the page and imports React.
  for (const href of ['/models/atelier/atelier.glb', '/models/atelier/camera.json']) {
    const link = document.createElement('link');
    link.rel = 'preload'; link.as = 'fetch'; link.href = href; link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
  }
  const onStudioLoad = event => {
    const load = event.detail;
    phase = load.phase;
    if (load.total > 0) modelProgress = Math.max(modelProgress, Math.min(1, load.loaded / load.total));
  };
  document.addEventListener('studio:load', onStudioLoad);
  function release(reason) {
    if (released) return;
    released = true;
    cancelAnimationFrame(frame);
    clearTimeout(failsafe); clearTimeout(leaveTimer); clearTimeout(releaseTimer);
    document.removeEventListener('studio:load', onStudioLoad);
    root.dataset.entryResult = reason;
    delete root.dataset.entry;
    const studio = document.getElementById('studio-root');
    if ((reason === 'error' || reason === 'timeout') && studio && studio.dataset.mounted !== 'true') studio.dataset.skipped = 'true';
    const page = document.querySelector('.page');
    if (page) page.inert = false;
  }
  // A failed or stalled 3D module must never lock visitors out of the portfolio.
  const failsafe = setTimeout(() => release('timeout'), 15000);
  addEventListener('pageshow', event => { if (event.persisted) release('restored'); });
  document.addEventListener('DOMContentLoaded', () => {
    if (released) return;
    document.querySelector('.page').inert = true;
    const panel = document.querySelector('.entry-loader__panel');
    const number = panel.querySelector('.entry-loader__percent');
    let shown = 0, last = performance.now();
    Promise.resolve(document.fonts.ready).catch(() => {}).then(() => { fontsReady = true; });
    function tick(now) {
      if (released || finishing) return;
      const settled = fontsReady && (phase === 'ready' || phase === 'error');
      const target = settled ? 100 : Math.min(95, (fontsReady ? 10 : 0) + (phase === 'preparing' ? 85 : modelProgress * 75));
      shown = Math.max(shown, reduced ? target : Math.min(target, shown + Math.min(100, now - last) / 12));
      last = now;
      const percent = Math.floor(shown);
      number.textContent = percent + '%';
      panel.setAttribute('aria-valuenow', String(percent));
      panel.style.setProperty('--entry-progress', String(shown / 100));
      if (shown >= 100) {
        finishing = true;
        leaveTimer = setTimeout(() => {
          root.dataset.entry = 'leaving';
          releaseTimer = setTimeout(() => release(phase), reduced ? 0 : 240);
        }, reduced ? 0 : 180);
      } else frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
  });
})();
