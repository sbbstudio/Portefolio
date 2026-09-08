/* Percentage represents settled first-view preparation steps, not download bytes. */
(() => {
  if (location.hash) return;
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let finished = false, frame = 0;
  root.dataset.entry = 'loading';
  function release() {
    finished = true;
    cancelAnimationFrame(frame);
    clearTimeout(failsafe);
    delete root.dataset.entry;
    const page = document.querySelector('.page');
    if (page) page.inert = false;
  }
  const failsafe = setTimeout(release, 6000);
  addEventListener('pageshow', event => { if (event.persisted) release(); });
  document.addEventListener('DOMContentLoaded', () => {
    if (finished) return;
    document.querySelector('.page').inert = true;
    const panel = document.querySelector('.entry-loader__panel');
    const number = panel.querySelector('.entry-loader__percent');
    let target = 0, shown = 0, last = performance.now();
    const tasks = [document.fonts.ready];
    tasks.forEach(task => Promise.resolve(task).catch(() => {}).then(() => { target += 100 / tasks.length; }));
    function tick(now) {
      if (finished) return;
      shown = reduced ? target : Math.min(target, shown + Math.min(100, now - last) / 12);
      last = now;
      const percent = Math.floor(shown);
      number.textContent = percent + '%';
      panel.setAttribute('aria-valuenow', String(percent));
      panel.style.setProperty('--entry-progress', String(shown / 100));
      if (shown >= 100) {
        finished = true;
        clearTimeout(failsafe);
        setTimeout(() => {
          root.dataset.entry = 'leaving';
          setTimeout(release, reduced ? 0 : 240);
        }, reduced ? 0 : 180);
      } else frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
  });
})();
