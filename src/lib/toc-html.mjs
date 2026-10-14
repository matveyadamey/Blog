import katex from 'katex';

export function tocHtml(text) {
  if (!text) return '';
  if (!text.includes('$')) return escapeHtml(text);

  let html = '';
  for (const part of splitMath(text)) {
    if (part.type === 'text') {
      html += escapeHtml(part.value);
      continue;
    }
    html += katex.renderToString(part.value, {
      throwOnError: false,
      displayMode: part.type === 'display',
      strict: 'ignore',
    });
  }
  return html;
}

function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function splitMath(text) {
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
      const end = text.indexOf('$$', i + 2);
      if (end !== -1) {
        flush();
        parts.push({ type: 'display', value: text.slice(i + 2, end) });
        i = end + 2;
        continue;
      }
    }
    if (text[i] === '$') {
      const end = text.indexOf('$', i + 1);
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
