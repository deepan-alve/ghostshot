// Concept C: the camera's LCD shows the mode, and the shutter clicks on every shot.
(() => {
  const stage = document.querySelector('[data-stage]');
  const lcdMode = document.querySelector('.lcd-mode');
  const NAMES = { image: 'IMG', text: 'TXT', path: 'PATH' };
  const sync = () => { lcdMode.textContent = NAMES[stage.dataset.mode] || 'IMG'; };
  new MutationObserver(sync).observe(stage, { attributes: true, attributeFilter: ['data-mode'] });
  sync();

  const cam = document.querySelector('.cam');
  document.addEventListener('ghostshot:capture', () => {
    cam.classList.remove('is-shooting');
    void cam.offsetWidth;
    cam.classList.add('is-shooting');
  });
})();
