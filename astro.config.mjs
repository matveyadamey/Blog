// @ts-check
import { defineConfig } from 'astro/config';
import expressiveCode, { pluginFramesTexts } from 'astro-expressive-code';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import { rehypeFigures } from './src/lib/rehype-figures.mjs';
import { rehypeMathInHtml } from './src/lib/rehype-math-in-html.mjs';
import { remarkLocalImages } from './src/lib/remark-local-images.mjs';
import { rehypeHeadingLabels } from './src/lib/remark-heading-labels.mjs';
import { remarkMathBlocks } from './src/lib/remark-math-blocks.mjs';

pluginFramesTexts.overrideTexts('en', {
  copyButtonTooltip: 'Скопировать',
  copyButtonCopied: 'Скопировано',
});

// GitHub Pages (репозиторий-проект): задайте SITE и BASE в CI.
// Локально — корень сайта.
const site = process.env.SITE || 'http://localhost:4321';
const base = process.env.BASE || '/';

export default defineConfig({
  site,
  base,
  trailingSlash: 'always',
  markdown: {
    remarkPlugins: [remarkMath, remarkMathBlocks, remarkLocalImages(base)],
    // Astro runs user rehype plugins *before* its own rehype-raw.
    // Parse HTML first so math inside <td> can be turned into KaTeX nodes.
    rehypePlugins: [rehypeRaw, rehypeMathInHtml, rehypeHeadingLabels, rehypeKatex, rehypeFigures],
  },
  integrations: [
    expressiveCode({
      themes: ['github-dark'],
      styleOverrides: {
        borderRadius: '0',
        borderColor: 'rgba(255,255,255,0.18)',
        codeBackground: '#0c1628',
        codeFontFamily: "'JetBrains Mono Variable', ui-monospace, monospace",
        uiFontFamily: "'JetBrains Mono Variable', ui-monospace, monospace",
        frames: {
          frameBoxShadowCssValue: 'none',
          editorBackground: '#0c1628',
          editorActiveTabBackground: 'transparent',
          editorTabBarBackground: 'rgba(255,255,255,0.04)',
          terminalBackground: '#0c1628',
          terminalTitlebarBackground: 'rgba(255,255,255,0.04)',
        },
      },
    }),
  ],
});
