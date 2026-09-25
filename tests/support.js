import primitivesCss from '../tokens/primitives.css?url';
import semanticCss from '../tokens/semantic.css?url';

// Helpers shared by the component tests (dev-only, not shipped).

/** Load a stylesheet the way Drupal would (a real <link>) and wait until it applies. */
export const loadCss = (href) =>
  new Promise((resolve, reject) => {
    const link = Object.assign(document.createElement('link'), { rel: 'stylesheet', href });
    link.onload = resolve;
    link.onerror = reject;
    document.head.append(link);
  });

/** Remove everything a test added, so the next test starts from an empty document. */
export const resetDocument = () => {
  document.body.innerHTML = '';
  document.head.querySelectorAll('link[rel=stylesheet]').forEach((node) => node.remove());
};

/** Load both token tiers, in the order the magoo/tokens library does. */
export const loadTokens = async () => {
  await loadCss(primitivesCss);
  await loadCss(semanticCss);
};
