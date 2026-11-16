// Concept D: a scan light sweeps the selected area before the page comes out.
(() => {
  const stage = document.querySelector('[data-stage]');
  const bar = document.querySelector('.scanbar');
  const glass = document.querySelector('.glass');
  document.addEventListener('ghostshot:capture', (e) => {
    const { rect } = e.detail;
    const s = stage.getBoundingClientRect();
    const g = glass.getBoundingClientRect();
    bar.style.left = `${s.left - g.left + rect.x}px`;
    bar.style.width = `${rect.w}px`;
    bar.style.setProperty('--from', `${s.top - g.top + rect.y}px`);
    bar.style.setProperty('--to', `${s.top - g.top + rect.y + rect.h}px`);
    bar.classList.remove('is-scanning');
    void bar.offsetWidth;
    bar.classList.add('is-scanning');
  });
})();
