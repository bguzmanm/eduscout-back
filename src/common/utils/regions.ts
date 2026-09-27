/**
 * Regiones de Chile con nombres canónicos cortos. Es la única fuente de verdad
 * para `jobs.region`: los adapters scrapean texto libre ("RM", "Región del
 * Biobío", "Providencia, Metropolitana, Chile"), así que todo lo que se persista
 * debe pasar por `normalizeRegion` para que el conteo de regiones y el filtro
 * del frontend no divergan.
 */
export const REGIONS = [
  'Tarapacá',
  'Arica y Parinacota',
  'Antofagasta',
  'Atacama',
  'Coquimbo',
  'Valparaíso',
  'Metropolitana',
  "O'Higgins",
  'Maule',
  'Ñuble',
  'Biobío',
  'Araucanía',
  'Los Ríos',
  'Los Lagos',
  'Aysén',
  'Magallanes',
] as const;

export type Region = (typeof REGIONS)[number];

/** Quita acentos, unifica apóstrofos, pasa a minúsculas y normaliza espacios. */
function fold(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['‘’`´]/g, "'")
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

const CANONICAL = new Map<string, Region>(
  REGIONS.map((region) => [fold(region), region]),
);

/**
 * Alias adicionales: nombres oficiales largos, abreviaturas habituales y las
 * principales ciudades por región. La clave es la versión "folded".
 */
const ALIASES: Record<string, Region> = {
  // Tarapacá
  iquique: 'Tarapacá',
  pica: 'Tarapacá',
  'pozo almonte': 'Tarapacá',
  'alto hospicio': 'Tarapacá',
  // Arica y Parinacota
  'arica y parinacota': 'Arica y Parinacota',
  arica: 'Arica y Parinacota',
  parinacota: 'Arica y Parinacota',
  putre: 'Arica y Parinacota',
  // Antofagasta
  antofagasta: 'Antofagasta',
  calama: 'Antofagasta',
  mejillones: 'Antofagasta',
  tocopilla: 'Antofagasta',
  // Atacama
  atacama: 'Atacama',
  copiapo: 'Atacama',
  vallenar: 'Atacama',
  chañaral: 'Atacama',
  huasco: 'Atacama',
  // Coquimbo
  coquimbo: 'Coquimbo',
  'la serena': 'Coquimbo',
  ovalle: 'Coquimbo',
  illapel: 'Coquimbo',
  combarbala: 'Coquimbo',
  // Valparaíso
  valparaiso: 'Valparaíso',
  'vina del mar': 'Valparaíso',
  quillota: 'Valparaíso',
  quintero: 'Valparaíso',
  'san antonio': 'Valparaíso',
  limache: 'Valparaíso',
  // Metropolitana
  metropolitana: 'Metropolitana',
  'metropolitana de santiago': 'Metropolitana',
  santiago: 'Metropolitana',
  rm: 'Metropolitana',
  providencia: 'Metropolitana',
  'las condes': 'Metropolitana',
  vitacura: 'Metropolitana',
  'lo prado': 'Metropolitana',
  'puente alto': 'Metropolitana',
  maipu: 'Metropolitana',
  nunoa: 'Metropolitana',
  huechuraba: 'Metropolitana',
  // O'Higgins
  "o'higgins": "O'Higgins",
  'o higgins': "O'Higgins",
  "libertador general bernardo o'higgins": "O'Higgins",
  'libertador general bernardo o higgins': "O'Higgins",
  rancagua: "O'Higgins",
  'san fernando': "O'Higgins",
  rengo: "O'Higgins",
  pichilemu: "O'Higgins",
  // Maule
  maule: 'Maule',
  curico: 'Maule',
  linares: 'Maule',
  talca: 'Maule',
  tenca: 'Maule',
  // Ñuble
  nuble: 'Ñuble',
  chillan: 'Ñuble',
  'san carlos': 'Ñuble',
  bulnes: 'Ñuble',
  // Biobío
  biobio: 'Biobío',
  concepcion: 'Biobío',
  talcahuano: 'Biobío',
  'los angeles': 'Biobío',
  coronel: 'Biobío',
  // Araucanía
  araucania: 'Araucanía',
  'la araucania': 'Araucanía',
  temuco: 'Araucanía',
  angol: 'Araucanía',
  villarrica: 'Araucanía',
  pocon: 'Araucanía',
  // Los Ríos
  'los rios': 'Los Ríos',
  valdivia: 'Los Ríos',
  'la union': 'Los Ríos',
  // Los Lagos
  'los lagos': 'Los Lagos',
  'puerto montt': 'Los Lagos',
  osorno: 'Los Lagos',
  castro: 'Los Lagos',
  ancud: 'Los Lagos',
  // Aysén
  aysen: 'Aysén',
  'aysen del general carlos ibanez del campo': 'Aysén',
  'carlos ibanez del campo': 'Aysén',
  coyhaique: 'Aysén',
  'puerto aysen': 'Aysén',
  // Magallanes
  magallanes: 'Magallanes',
  'magallanes y de la antartica chilena': 'Magallanes',
  'antartica': 'Magallanes',
  'punta arenas': 'Magallanes',
  porvenir: 'Magallanes',
  'rio verde': 'Magallanes',
};

// Las coincidencias parciales solo se aceptan con claves largas: "rm" o
// "pica" solo valen como coincidencia exacta, no dentro de un texto libre.
const PARTIAL_KEYS = Object.keys(ALIASES)
  .filter((key) => key.length >= 5)
  .sort((a, b) => b.length - a.length);

// Mismos nombres sin espacios, para absorber variantes como "Bío Bío".
const COMPACT = new Map<string, Region>();
for (const [key, region] of CANONICAL) {
  COMPACT.set(key.replace(/\s/g, ''), region);
}
for (const [key, region] of Object.entries(ALIASES)) {
  COMPACT.set(key.replace(/\s/g, ''), region);
}

function matchExact(folded: string): Region | null {
  return CANONICAL.get(folded) ?? ALIASES[folded] ?? null;
}

function matchPartial(folded: string): Region | null {
  for (const key of PARTIAL_KEYS) {
    if (folded.includes(key)) return ALIASES[key];
  }
  return null;
}

/**
 * Lleva cualquier texto libre a una de las 16 regiones canónicas.
 * Devuelve `null` cuando no se puede identificar (teletrabajo, "a distancia",
 * nombres desconocido, etc.): es preferible no tener región a tener una que
 * no existe.
 */
export function normalizeRegion(
  raw: string | null | undefined,
): Region | null {
  if (!raw) return null;
  const folded = fold(raw);
  if (!folded) return null;

  const exact = matchExact(folded);
  if (exact) return exact;

  // "Providencia, Metropolitana, Chile" o "Viña del Mar | Valparaíso".
  const parts = folded
    .split(/[,;/|]/)
    .map((part) => part.trim())
    .filter(Boolean);
  for (const part of parts) {
    const hit = matchExact(part) ?? COMPACT.get(part.replace(/\s/g, ''));
    if (hit) return hit;
  }

  const compact = folded.replace(/\s/g, '');
  if (COMPACT.has(compact)) return COMPACT.get(compact)!;

  return matchPartial(folded);
}
