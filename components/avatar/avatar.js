/**
 * mg-avatar: optional JS tier.
 *
 * The avatar needs no JS to render. This script only covers one gap: an <img> that fails to load leaves an empty
 * circle, because CSS cannot see a failed load. It hides the broken image, so the initials behind it show.
 * One delegated capture listener on the document (`error` does not bubble), so it needs no upgrade step and also
 * works for avatars Drupal inserts later (AJAX, BigPipe). Without it, a broken image just shows the empty avatar.
 */
(() => {
  const hideIfBroken = (image) => {
    if (image.matches('mg-avatar > img')) image.hidden = true;
  };

  document.addEventListener(
    'error',
    (event) => {
      if (event.target instanceof HTMLImageElement) hideIfBroken(event.target);
    },
    true,
  );

  // Images that failed before this script ran will not fire `error` again.
  const sweep = () => {
    for (const image of document.querySelectorAll('mg-avatar > img')) {
      if (image.complete && image.naturalWidth === 0) hideIfBroken(image);
    }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', sweep);
  else sweep();
})();
