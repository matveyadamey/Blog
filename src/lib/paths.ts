const BASE = import.meta.env.BASE_URL;

export function url(path = '/'): string {
  const base = BASE.replace(/\/$/, '');
  const rel = path.replace(/^\//, '');
  return rel ? `${base}/${rel}` : `${base}/`;
}

export function postCover(slug: string, cover?: string): string | undefined {
  if (!cover) return undefined;
  if (cover.startsWith('http://') || cover.startsWith('https://')) return cover;
  if (cover.startsWith('/')) return url(cover.replace(/^\//, ''));
  return url(`images/posts/${slug}/${cover}`);
}
