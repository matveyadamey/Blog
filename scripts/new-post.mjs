import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const title = process.argv.slice(2).join(' ').trim();

if (!title) {
  console.error('Использование: npm run new -- "Название статьи"');
  process.exit(1);
}

const slug = title
  .toLowerCase()
  .replace(/ё/g, 'е')
  .replace(/[^a-z0-9а-я]+/gi, '-')
  .replace(/^-|-$/g, '')
  .replace(/[а-я]/g, (ch) => {
    const map = {
      а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ж: 'zh', з: 'z',
      и: 'i', й: 'j', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p',
      р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch',
      ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
    };
    return map[ch] ?? '';
  })
  .replace(/-+/g, '-')
  .replace(/^-|-$/g, '') || 'post';

const mdPath = join(root, 'src/content/posts', `${slug}.md`);
const imgDir = join(root, 'public/images/posts', slug);

if (existsSync(mdPath)) {
  console.error(`Уже существует: ${mdPath}`);
  process.exit(1);
}

const today = new Date().toISOString().slice(0, 10);
const body = `---
title: ${JSON.stringify(title)}
date: ${today}
excerpt: Краткое описание для ленты и поиска.
cover: cover.svg
---

Первый абзац статьи. Картинки кладите в \`public/images/posts/${slug}/\` и вставляйте по имени файла:

![Подпись под рисунком](cover.svg)

Формулы — как в LaTeX. Строчная: $E = mc^2$. Выносная:

$$
\\int_{-\\infty}^{\\infty} e^{-x^2}\\,dx = \\sqrt{\\pi}
$$

Код с именем файла:

\`\`\`python title="train.py"
print("hello")
\`\`\`
`;

mkdirSync(dirname(mdPath), { recursive: true });
mkdirSync(imgDir, { recursive: true });
writeFileSync(mdPath, body, 'utf8');
writeFileSync(
  join(imgDir, 'cover.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" fill="none">
  <rect width="1600" height="900" fill="#0a0a0a"/>
  <rect x="80" y="80" width="1440" height="740" stroke="#fff" stroke-opacity=".2"/>
  <path d="M200 680 L800 220 L1400 680" stroke="#fff" stroke-width="3"/>
  <text x="200" y="780" fill="#fff" fill-opacity=".5" font-family="monospace" font-size="28">${slug}</text>
</svg>
`,
  'utf8',
);

console.log(`Создано:\n  ${mdPath}\n  ${imgDir}\\`);
console.log(`URL: /posts/${slug}/`);
