export const BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'es-CL,es;q=0.9,en;q=0.8',
};

export interface NuxtOfferCard {
  id: number;
  title: string;
  company: string;
  description: string;
  location: string;
  jobType: string;
  publishedAt: string;
}

const isNode = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

export function parseNuxtData(html: string): unknown[] {
  const match = html.match(
    /<script[^>]*id="__NUXT_DATA__"[^>]*>([\s\S]*?)<\/script>/,
  );
  if (!match) return [];

  try {
    const parsed = JSON.parse(match[1]);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function resolveNuxtValue(raw: unknown[], index: unknown): unknown {
  if (typeof index !== 'number' || index < 0 || index >= raw.length) {
    return undefined;
  }
  return raw[index];
}

export function extractNuxtOfferCards(raw: unknown[]): NuxtOfferCard[] {
  const cards: NuxtOfferCard[] = [];

  for (const node of raw) {
    if (!isNode(node)) continue;
    if (!('idOferta' in node) || !('nombreCargo' in node)) continue;

    const id = resolveNuxtValue(raw, node.idOferta);
    if (typeof id !== 'number' && typeof id !== 'string') continue;

    const title = String(resolveNuxtValue(raw, node.nombreCargo) ?? '');
    if (!id || !title) continue;

    cards.push({
      id: Number(id),
      title,
      company: String(resolveNuxtValue(raw, node.nombreEmpresa) ?? ''),
      description: String(resolveNuxtValue(raw, node.descripcionOferta) ?? ''),
      location: String(resolveNuxtValue(raw, node.ubicacion) ?? ''),
      jobType: String(resolveNuxtValue(raw, node.nombreJornada) ?? ''),
      publishedAt: String(resolveNuxtValue(raw, node.fechaPublicacion) ?? ''),
    });
  }

  return cards;
}