const preview = document.querySelector('.image-preview');
const content = preview.querySelector('.image-preview-content');
let trigger;

for (const link of document.querySelectorAll('.product-frame a, .detail-frame a')) {
  link.addEventListener('click', (event) => {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey
      || typeof preview.showModal !== 'function') return;
    event.preventDefault();
    const image = link.querySelector('img').cloneNode();
    image.src = link.href;
    image.loading = 'eager';
    content.replaceChildren(image);
    trigger = link;
    preview.showModal();
  });
}

preview.addEventListener('click', (event) => {
  if (event.target !== preview) return;
  const bounds = preview.getBoundingClientRect();
  if (event.clientX < bounds.left || event.clientX > bounds.right
    || event.clientY < bounds.top || event.clientY > bounds.bottom) preview.close();
});
preview.addEventListener('close', () => {
  content.replaceChildren();
  trigger?.focus({ preventScroll: true });
});
