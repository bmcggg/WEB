export function notifyPostChange(change) {
  window.dispatchEvent(new CustomEvent('fella:post-change', { detail: change }));
}
