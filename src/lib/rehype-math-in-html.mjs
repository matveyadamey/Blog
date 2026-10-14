import { visit } from 'unist-util-visit';

const SKIP_TAGS = new Set(['code', 'pre', 'script', 'style', 'textarea', 'kbd', 'samp']);

/**
 * remark-math does not see `$…$` inside raw HTML (tables, etc.).
 * Turn those delimiters into the same nodes remark-math emits so rehype-katex
 * can render them. Also turns leftover `**bold**` into <strong>.
 *
 * Must run after HTML is parsed (rehype-raw) and before rehype-katex.
 */
export function rehypeMathInHtml() {
  return (tree) => {
    visit(tree, 'text', (node, index, parent) => {
      if (index == null || !parent || parent.type !== 'element') return;
      if (SKIP_TAGS.has(parent.tagName)) return;

      const classes = classList(parent);
      if (classes.includes('math-inline') || classes.includes('math-display') || classes.includes('language-math')) {
        return;
      }

      const value = node.value;
      if (!value || (!value.includes('$') && !value.includes('**'))) return;

      const next = expandPhrasing(value);
      if (next.length === 1 && next[0].type === 'text' && next[0].value === value) return;

      parent.children.splice(index, 1, ...next);
      return index + next.length;
    });

    visit(tree, 'element', (node, index, parent) => {
      if (node.tagName !== 'table' || !parent || index == null) return;
      if (parent.type === 'element' && classList(parent).includes('table-wrap')) return;
      parent.children[index] = {
        type: 'element',
        tagName: 'div',
        properties: { className: ['table-wrap'] },
        children: [node],
      };
      return index + 1;
    });
  };
}

function classList(node) {
  const classes = node.properties?.className;
  return Array.isArray(classes) ? classes : [];
}

function expandPhrasing(text) {
  const out = [];
  for (const part of splitMath(text)) {
    if (part.type === 'inline' || part.type === 'display') {
      out.push(mathNode(part.type, part.value));
      continue;
    }
    out.push(...splitBold(part.value));
  }
  return out;
}

function mathNode(kind, value) {
  const display = kind === 'display';
  return {
    type: 'element',
    tagName: 'code',
    properties: {
      className: display
        ? ['language-math', 'math-display']
        : ['language-math', 'math-inline'],
    },
    children: [{ type: 'text', value }],
  };
}

function splitMath(text) {
  /** @type {{type: 'text' | 'inline' | 'display', value: string}[]} */
  const parts = [];
  let i = 0;
  let buf = '';

  const flush = () => {
    if (buf) {
      parts.push({ type: 'text', value: buf });
      buf = '';
    }
  };

  while (i < text.length) {
    if (text[i] === '\\' && text[i + 1] === '$') {
      buf += '$';
      i += 2;
      continue;
    }

    if (text.startsWith('$$', i)) {
      const end = indexOfUnescaped(text, '$$', i + 2);
      if (end !== -1) {
        flush();
        parts.push({ type: 'display', value: text.slice(i + 2, end) });
        i = end + 2;
        continue;
      }
    }

    if (text[i] === '$') {
      const end = indexOfUnescaped(text, '$', i + 1);
      if (end !== -1 && end > i + 1) {
        flush();
        parts.push({ type: 'inline', value: text.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
    }

    buf += text[i];
    i += 1;
  }

  flush();
  return parts;
}

function indexOfUnescaped(text, needle, from) {
  let i = from;
  while (i < text.length) {
    const at = text.indexOf(needle, i);
    if (at === -1) return -1;
    if (at > 0 && text[at - 1] === '\\') {
      i = at + needle.length;
      continue;
    }
    return at;
  }
  return -1;
}

function splitBold(text) {
  const out = [];
  const re = /\*\*(.+?)\*\*/g;
  let last = 0;
  let m;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push({ type: 'text', value: text.slice(last, m.index) });
    out.push({
      type: 'element',
      tagName: 'strong',
      properties: {},
      children: [{ type: 'text', value: m[1] }],
    });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ type: 'text', value: text.slice(last) });
  if (!out.length) out.push({ type: 'text', value: text });
  return out;
}
