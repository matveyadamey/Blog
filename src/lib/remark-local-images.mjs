import { visit } from 'unist-util-visit';

/**
 * Relative image URLs in a post resolve to {base}/images/posts/<slug>/<file>.
 * Absolute site-root paths get the configured base prefix.
 */
export function remarkLocalImages(base = '/') {
  const prefix = base.replace(/\/$/, '');
  return () => (tree, file) => {
    const slug = slugFromFile(file);

    visit(tree, 'image', (node) => {
      const src = String(node.url || '');
      if (!src || src.startsWith('http') || src.startsWith('data:')) return;

      let next = src;
      if (!src.startsWith('/')) {
        if (!slug) return;
        next = `/images/posts/${slug}/${src.replace(/^\.\//, '')}`;
      }
      node.url = prefix && !next.startsWith(`${prefix}/`) ? `${prefix}${next}` : next;
    });
  };
}

function slugFromFile(file) {
  const path = String(file.history?.[0] || file.path || '').replace(/\\/g, '/');
  const match = path.match(/\/posts\/([^/]+)\.(md|mdx)$/);
  return match ? match[1] : '';
}
