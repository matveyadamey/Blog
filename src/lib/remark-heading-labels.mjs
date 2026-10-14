import GithubSlugger from 'github-slugger';
import { visit } from 'unist-util-visit';

export function headingSlug(label, slugger) {
  let slug = slugger.slug(label);
  if (slug.endsWith('-')) slug = slug.slice(0, -1);
  return slug;
}

/** ATX headings from markdown, keeping `$…$` so the TOC can render KaTeX. */
export function headingsFromMarkdown(body) {
  let src = String(body ?? '');
  if (src.startsWith('---')) {
    const end = src.indexOf('\n---', 3);
    if (end !== -1) src = src.slice(end + 4);
  }

  const slugger = new GithubSlugger();
  const headings = [];
  let fence = false;
  for (const line of src.split(/\n/)) {
    if (line.trimStart().startsWith('```')) {
      fence = !fence;
      continue;
    }
    if (fence) continue;
    const match = /^(#{1,6})\s+(.+?)\s*$/.exec(line);
    if (!match) continue;
    const text = match[2].replace(/\s+#+\s*$/, '').trim();
    headings.push({
      depth: match[1].length,
      slug: headingSlug(text, slugger),
      text,
    });
  }
  return headings;
}

function flattenHeading(node) {
  let text = '';
  const walk = (n) => {
    if (n.type === 'text') {
      text += n.value;
      return;
    }
    if (n.type !== 'element') return;
    const classes = Array.isArray(n.properties?.className) ? n.properties.className : [];
    if (classes.includes('math-inline') || classes.includes('language-math')) {
      const tex = (n.children || []).map((c) => (c.type === 'text' ? c.value : '')).join('');
      text += `$${tex}$`;
      return;
    }
    (n.children || []).forEach(walk);
  };
  (node.children || []).forEach(walk);
  return text.trim();
}

/**
 * Set heading ids from the pre-KaTeX tree so TOC anchors match rendered math.
 */
export function rehypeHeadingLabels() {
  return (tree) => {
    const slugger = new GithubSlugger();
    visit(tree, 'element', (node) => {
      if (!/^h[1-6]$/.test(node.tagName)) return;
      const text = flattenHeading(node);
      node.properties = node.properties || {};
      node.properties.id = headingSlug(text, slugger);
    });
  };
}
