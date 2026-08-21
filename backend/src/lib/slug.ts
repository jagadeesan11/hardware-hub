/** URL-safe slug: "Teak Wood Flush Door 32mm" -> "teak-wood-flush-door-32mm" */
export const slugify = (input: string): string =>
  input
    .toLowerCase()
    .normalize('NFKD')
    // Strip combining marks left behind by NFKD (e.g. "é" -> "e").
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
