/**
 * Los HTML de las instituciones vienen llenos de `&nbsp;` y otros espacios
 * "invisibles" (thin space, narrow no-break space, ideographic space). El
 * navegador no los puede cortar al justified, así que una frase completa queda
 * como una palabra indestructible: el ancho mínimo de la página se dispara
 * (un título llegó a medir 698px dentro de un viewport de 375px) y en móvil
 * aparece scroll horizontal con el logo fuera de pantalla.
 *
 * Convertirlos a espacios normales al guardar deja el dato sano para todos los
 * consumidores (cards, detalle, Telegram, metadatos y JSON-LD).
 */
const INVISIBLE_SPACES = /[\u00a0\u1680\u2000-\u200a\u202f\u205f\u3000]/g;

/** Texto de una sola línea: también colapsa cualquier espacio duplicado. */
export function normalizeText(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const normalized = value
    .replace(INVISIBLE_SPACES, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return normalized.length > 0 ? normalized : null;
}

/**
 * HTML de descripción/requisitos: conserva los saltos de línea porque los
 * adapters los usan para separar párrafos, y colapsa solo el espacio horizontal
 * repetido. Devuelve `undefined` si el campo no viene, para no pisar el valor
 * guardado con un `null`.
 */
export function normalizeRichText(
  value: string | null | undefined,
): string | undefined {
  if (value === null || value === undefined) return undefined;
  const normalized = value
    .replace(/&nbsp;/gi, ' ')
    .replace(INVISIBLE_SPACES, ' ')
    .replace(/[^\S\n]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return normalized.length > 0 ? normalized : undefined;
}
