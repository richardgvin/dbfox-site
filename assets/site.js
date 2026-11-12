// Progressive enhancement only: every picture and caption reads without this file.
const preview = document.querySelector('.image-preview');
const stage = preview.querySelector('.image-preview-content');
const title = preview.querySelector('.preview-title');
const steppers = [...preview.querySelectorAll('.preview-step')];
const zoom = preview.querySelector('.preview-zoom');
let group = [];
let shown = 0;

function setZoom(on) {
  zoom.setAttribute('aria-pressed', on);
  zoom.querySelector('span').textContent = on ? zoom.dataset.fit : zoom.dataset.zoom;
  stage.classList.toggle('is-zoomed', on);
  stage.scrollTo(0, 0);
  // A zoomed picture scrolls, so the keyboard needs a way into the scroll area.
  if (on) stage.tabIndex = 0;
  else stage.removeAttribute('tabindex');
}

function show(position) {
  shown = (position + group.length) % group.length;
  const link = group[shown];
  const inline = link.querySelector('img');
  // A new element, not a clone: a clone keeps the pixel density chosen from srcset.
  const image = new Image();
  image.alt = inline.alt;
  // The page already holds this picture; it stands in until the full capture has loaded.
  image.src = inline.currentSrc;
  const full = new Image();
  full.src = link.href;
  full.decode().then(() => { if (image.isConnected) image.src = link.href; }, () => {});
  // Attributes carry the capture's size at 1x; the linked file is twice that.
  const width = inline.getAttribute('width');
  stage.style.setProperty('--actual-width', `${width * 2}px`);
  image.width = width * 2;
  image.height = inline.getAttribute('height') * 2;
  image.addEventListener('click', () => setZoom(!stage.classList.contains('is-zoomed')));
  stage.replaceChildren(image);
  setZoom(false);
  const frame = link.closest('.flow-frame');
  // Keeps the page on the step being read, so closing returns to a visible link.
  frame?.dispatchEvent(new Event('flow:show'));
  title.textContent = frame ? `${shown + 1} / ${group.length} · ${frame.dataset.step}` : '';
  for (const stepper of steppers) stepper.hidden = group.length < 2;
}

document.addEventListener('click', (event) => {
  const link = event.target.closest('.shot a');
  if (!link || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey
    || typeof preview.showModal !== 'function') return;
  event.preventDefault();
  const flow = link.closest('.flow');
  group = flow ? [...flow.querySelectorAll('.shot a')] : [link];
  show(group.indexOf(link));
  preview.showModal();
});

steppers[0].addEventListener('click', () => show(shown - 1));
steppers[1].addEventListener('click', () => show(shown + 1));
zoom.addEventListener('click', () => setZoom(!stage.classList.contains('is-zoomed')));
preview.addEventListener('keydown', (event) => {
  // Arrow keys scroll a zoomed picture; otherwise they step through the flow.
  if (group.length < 2 || stage.classList.contains('is-zoomed')) return;
  if (event.key === 'ArrowLeft') show(shown - 1);
  if (event.key === 'ArrowRight') show(shown + 1);
});
preview.addEventListener('click', (event) => {
  if (event.target !== preview) return;
  const bounds = preview.getBoundingClientRect();
  if (event.clientX < bounds.left || event.clientX > bounds.right
    || event.clientY < bounds.top || event.clientY > bounds.bottom) preview.close();
});
preview.addEventListener('close', () => {
  stage.replaceChildren();
  group[shown]?.focus({ preventScroll: true });
});

const stillMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
for (const flow of document.querySelectorAll('.flow')) {
  const frames = [...flow.querySelectorAll('.flow-frame')];
  const bar = document.createElement('div');
  const steps = document.createElement('div');
  const toggle = document.createElement('button');
  let current = 0;

  function select(position) {
    current = position;
    frames.forEach((frame, index) => {
      frame.classList.toggle('is-current', index === current);
      tabs[index].setAttribute('aria-selected', index === current);
      tabs[index].tabIndex = index === current ? 0 : -1;
    });
  }
  function setAuto(on) {
    flow.classList.toggle('flow-auto', on);
    toggle.dataset.state = on ? 'playing' : 'paused';
    toggle.setAttribute('aria-label', on ? flow.dataset.pause : flow.dataset.play);
  }

  const tabs = frames.map((frame, index) => {
    const tab = document.createElement('button');
    tab.type = 'button';
    tab.className = 'flow-step';
    tab.id = `${frame.id}-step`;
    tab.textContent = frame.dataset.step;
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-controls', frame.id);
    frame.setAttribute('role', 'tabpanel');
    frame.setAttribute('aria-labelledby', tab.id);
    // Choosing a step is taking over: the walkthrough stops advancing by itself.
    tab.addEventListener('click', () => { setAuto(false); select(index); });
    frame.addEventListener('flow:show', () => { setAuto(false); select(index); });
    return tab;
  });
  steps.className = 'flow-steps';
  steps.setAttribute('role', 'tablist');
  steps.setAttribute('aria-label', flow.dataset.label);
  steps.append(...tabs);
  steps.addEventListener('keydown', (event) => {
    const target = { ArrowRight: current + 1, ArrowLeft: current - 1, Home: 0, End: frames.length - 1 }[event.key];
    if (target === undefined) return;
    event.preventDefault();
    setAuto(false);
    select((target + frames.length) % frames.length);
    tabs[current].focus();
  });
  // The progress line under the current step is the timer; see site.css.
  // One pass is enough to show the sequence; after it the reader is in charge.
  steps.addEventListener('animationend', () => {
    if (current === frames.length - 1) setAuto(false);
    select((current + 1) % frames.length);
  });
  toggle.type = 'button';
  toggle.className = 'tool-button flow-toggle';
  toggle.addEventListener('click', () => setAuto(!flow.classList.contains('flow-auto')));
  bar.className = 'flow-bar';
  bar.append(steps);
  if (!stillMotion) bar.append(toggle);
  flow.prepend(bar);
  flow.classList.add('flow-ready');
  select(0);
  setAuto(!stillMotion);
  new IntersectionObserver(([entry]) => flow.classList.toggle('is-visible', entry.isIntersecting), { threshold: 0.4 }).observe(flow);
}
