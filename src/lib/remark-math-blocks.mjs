import { visit } from 'unist-util-visit';

const INNER = new Set(['condition', 'method', 'solution', 'answer']);

/** Opt-in flags: [def] **Title** or ![def] **Title** */
const FLAGS = {
  def: { kind: 'definition', kicker: 'Определение' },
  definition: { kind: 'definition', kicker: 'Определение' },
  thm: { kind: 'theorem', kicker: 'Теорема' },
  theorem: { kind: 'theorem', kicker: 'Теорема' },
  lem: { kind: 'lemma', kicker: 'Лемма' },
  lemma: { kind: 'lemma', kicker: 'Лемма' },
  cor: { kind: 'corollary', kicker: 'Следствие' },
  prop: { kind: 'proposition', kicker: 'Предложение' },
  ex: { kind: 'example', kicker: 'Пример' },
  example: { kind: 'example', kicker: 'Пример' },
  proof: { kind: 'proof', kicker: 'Доказательство' },
  note: { kind: 'remark', kicker: 'Замечание' },
  remark: { kind: 'remark', kicker: 'Замечание' },
};

const RULES = [
  { re: /^доказательство(?=[\s.:—–-]|$)/i, kind: 'proof', kicker: 'Доказательство' },
  { re: /^определение(?=[\s.:—–-]|$)/i, kind: 'definition', kicker: 'Определение' },
  { re: /^теорема(?=[\s.:—–-]|$)/i, kind: 'theorem', kicker: 'Теорема' },
  { re: /^лемма(?=[\s.:—–-]|$)/i, kind: 'lemma', kicker: 'Лемма' },
  { re: /^следствие(?=[\s.:—–-]|$)/i, kind: 'corollary', kicker: 'Следствие' },
  { re: /^предложение(?=[\s.:—–-]|$)/i, kind: 'proposition', kicker: 'Предложение' },
  { re: /^утверждение(?=[\s.:—–-]|$)/i, kind: 'theorem', kicker: 'Утверждение' },
  { re: /^пример(?=[\s.:—–-]|$)/i, kind: 'example', kicker: 'Пример' },
  { re: /^задача(?=[\s.:—–-]|$)/i, kind: 'problem', kicker: 'Задача' },
  { re: /^замечание(?=[\s.:—–-]|$)/i, kind: 'remark', kicker: 'Замечание' },
  { re: /^условие(?=[\s.:—–-]|$)/i, kind: 'condition', kicker: 'Условие' },
  { re: /^метод(?:\s+решения)?(?=[\s.:—–-]|$)/i, kind: 'method', kicker: 'Метод' },
  { re: /^решение(?=[\s.:—–-]|$)/i, kind: 'solution', kicker: 'Решение' },
  { re: /^ответ(?=[\s.:—–-]|$)/i, kind: 'answer', kicker: 'Ответ' },
];

/**
 * Wrap labeled paragraphs into callout asides.
 * Definitions need an explicit label or [def] / ![def] flag — never bare bold.
 */
export function remarkMathBlocks() {
  return (tree) => {
    wrapChildren(tree);
  };
}

function wrapChildren(parent) {
  if (!parent.children?.length) return;

  const out = [];
  /** @type {null | { kind: string, kicker: string, titleNodes: unknown[], nodes: unknown[] }} */
  let buf = null;

  const flush = () => {
    if (!buf) return;
    out.push(makeCallout(buf));
    buf = null;
  };

  for (const node of parent.children) {
    if (node.type === 'heading' || node.type === 'thematicBreak') {
      flush();
      out.push(node);
      continue;
    }

    const info = classify(node);
    if (!info) {
      // Images / code end a short callout (definition, theorem, …), but stay inside tasks.
      if (buf && buf.kind !== 'problem' && breaksCallout(node)) {
        flush();
        out.push(node);
        continue;
      }
      // A lone bold title closes the previous callout (section label, not a block).
      if (buf && buf.kind !== 'problem' && isLoneBoldTitle(node)) {
        flush();
        out.push(node);
        continue;
      }
      if (buf) buf.nodes.push(node);
      else out.push(node);
      continue;
    }

    const stayInProblem =
      buf?.kind === 'problem' &&
      (INNER.has(info.kind) || info.kind === 'proof');

    if (stayInProblem) {
      buf.nodes.push(markSlot(node, info));
      continue;
    }

    if (INNER.has(info.kind) && !buf) {
      startBuffer(info, node, (next) => {
        buf = next;
      });
      continue;
    }

    flush();
    startBuffer(info, node, (next) => {
      buf = next;
    });
  }

  flush();
  parent.children = out;
}

function startBuffer(info, node, assign) {
  const buf = {
    kind: info.kind,
    kicker: info.kicker,
    titleNodes: info.titleNodes,
    nodes: [],
  };
  const rest = info.bodyNodes?.length
    ? { type: 'paragraph', children: info.bodyNodes }
    : null;
  if (rest) buf.nodes.push(rest);
  assign(buf);
}

function classify(node) {
  if (node.type !== 'paragraph' || !node.children?.length) return null;

  const flagged = classifyFlag(node);
  if (flagged) return flagged;

  let i = skipSpace(node.children, 0);
  const strong = node.children[i];
  if (!strong || strong.type !== 'strong') return null;

  const raw = strongText(strong).trim();
  if (!raw) return null;

  const trailing = node.children.slice(i + 1);
  const onlyStrong = isBlankTrail(trailing);

  for (const rule of RULES) {
    const match = raw.match(rule.re);
    if (!match) continue;
    return {
      kind: rule.kind,
      kicker: rule.kicker,
      titleNodes: titlePhrasing(strong, match[0]),
      bodyNodes: onlyStrong ? [] : stripLeadingSeps(trailing),
    };
  }

  return null;
}

/**
 * [def] **Title**
 * ![def] **Title**
 * **[def] Title**
 */
function classifyFlag(node) {
  const kids = node.children;
  let i = skipSpace(kids, 0);
  if (i >= kids.length) return null;

  const first = kids[i];

  // ![def]
  if (first.type === 'image') {
    const meta = FLAGS[String(first.alt || '').trim().toLowerCase()];
    if (!meta) return null;
    return titledFrom(kids, i + 1, meta);
  }

  // [def] or ![def] or ![def]() as text
  if (first.type === 'text') {
    const m = String(first.value).match(/^\s*!?\[([^\]]+)\](?:\(\s*\))?\s*/);
    if (m && FLAGS[m[1].toLowerCase()]) {
      const meta = FLAGS[m[1].toLowerCase()];
      const restText = String(first.value).slice(m[0].length);
      const rest = [];
      if (restText) rest.push({ type: 'text', value: restText });
      rest.push(...kids.slice(i + 1));
      return titledFrom(rest, skipSpace(rest, 0), meta);
    }
  }

  // **[def] Title**
  if (first.type === 'strong') {
    const raw = strongText(first).trim();
    const m = raw.match(/^\[([^\]]+)\]\s*/);
    if (m && FLAGS[m[1].toLowerCase()]) {
      const meta = FLAGS[m[1].toLowerCase()];
      const trailing = kids.slice(i + 1);
      return {
        kind: meta.kind,
        kicker: meta.kicker,
        titleNodes: titlePhrasing(first, m[0]),
        bodyNodes: isBlankTrail(trailing) ? [] : stripLeadingSeps(trailing),
      };
    }
  }

  return null;
}

function titledFrom(kids, start, meta) {
  let j = skipSpace(kids, start);
  const strong = kids[j];
  if (strong?.type === 'strong') {
    const trailing = kids.slice(j + 1);
    return {
      kind: meta.kind,
      kicker: meta.kicker,
      titleNodes: titlePhrasing(strong, ''),
      bodyNodes: isBlankTrail(trailing) ? [] : stripLeadingSeps(trailing),
    };
  }

  const titleSlice = kids.slice(j);
  if (!titleSlice.length) {
    return { kind: meta.kind, kicker: meta.kicker, titleNodes: [], bodyNodes: [] };
  }
  const titleNodes = JSON.parse(JSON.stringify(titleSlice));
  if (titleNodes[0]?.type === 'text') {
    titleNodes[0].value = String(titleNodes[0].value).replace(/^\s+/, '').replace(/[:.]+$/, '');
  }
  capitalizeTitle(titleNodes);
  return {
    kind: meta.kind,
    kicker: meta.kicker,
    titleNodes: titleNodes.filter((n) => !(n.type === 'text' && !String(n.value).trim())),
    bodyNodes: [],
  };
}

function breaksCallout(node) {
  if (node.type === 'code') return true;
  if (node.type === 'paragraph' && isImageOnlyParagraph(node)) return true;
  return false;
}

function isImageOnlyParagraph(node) {
  const meaningful = (node.children || []).filter(
    (c) => !(c.type === 'text' && !String(c.value).trim()),
  );
  return meaningful.length > 0 && meaningful.every((c) => c.type === 'image');
}

function isLoneBoldTitle(node) {
  if (node.type !== 'paragraph' || !node.children?.length) return false;
  let i = skipSpace(node.children, 0);
  const strong = node.children[i];
  if (!strong || strong.type !== 'strong') return false;
  return isBlankTrail(node.children.slice(i + 1));
}

function skipSpace(kids, from) {
  let i = from;
  while (i < kids.length && kids[i].type === 'text' && !String(kids[i].value).trim()) i += 1;
  return i;
}

function isBlankTrail(nodes) {
  return nodes.every((child) => child.type === 'text' && !String(child.value).trim());
}

function stripLeadingSeps(nodes) {
  const out = JSON.parse(JSON.stringify(nodes));
  while (out.length && out[0].type === 'text') {
    out[0].value = String(out[0].value).replace(/^[\s.:—–-]+/, '');
    if (out[0].value) break;
    out.shift();
  }
  return out.filter((n) => !(n.type === 'text' && !String(n.value).trim()));
}

function strongText(strong) {
  let text = '';
  visit(strong, 'text', (n) => {
    text += n.value;
  });
  return text;
}

function titlePhrasing(strong, prefix) {
  const nodes = JSON.parse(JSON.stringify(strong.children || []));
  if (prefix) {
    for (const n of nodes) {
      if (n.type !== 'text') break;
      const trimmed = String(n.value).replace(/^\s+/, '');
      if (trimmed.toLowerCase().startsWith(prefix.toLowerCase())) {
        n.value = trimmed.slice(prefix.length).replace(/^[\s.:—–-]+/, '').replace(/[.]+$/, '');
      }
      break;
    }
  }
  const next = nodes.filter((n) => !(n.type === 'text' && !String(n.value).trim()));
  capitalizeTitle(next);
  return next;
}

function capitalizeTitle(nodes) {
  const first = nodes[0];
  if (!first || first.type !== 'text' || !first.value) return;
  const ch = first.value[0];
  if (!/[a-zа-яё]/i.test(ch)) return;
  first.value = ch.toUpperCase() + first.value.slice(1);
}

function markSlot(node, info) {
  return {
    ...node,
    data: {
      ...node.data,
      hProperties: {
        ...node.data?.hProperties,
        className: ['callout-slot', `callout-slot--${info.kind}`],
      },
    },
  };
}

function makeCallout(buf) {
  const children = [];
  children.push(hastDiv(['callout-kicker', 'mono'], [{ type: 'text', value: buf.kicker }]));
  if (buf.titleNodes?.length) {
    children.push({
      type: 'calloutPart',
      data: { hName: 'div', hProperties: { className: ['callout-title'] } },
      children: [{ type: 'strong', children: buf.titleNodes }],
    });
  }
  children.push(hastDiv(['callout-body'], buf.nodes.filter(Boolean)));
  return {
    type: 'callout',
    data: {
      hName: 'aside',
      hProperties: { className: ['callout', `callout--${buf.kind}`] },
    },
    children,
  };
}

function hastDiv(className, children) {
  return {
    type: 'calloutPart',
    data: { hName: 'div', hProperties: { className } },
    children,
  };
}
