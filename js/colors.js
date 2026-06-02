// Mapping of short letter keys / names to color codes.
export const COLOR_MAP = {
  a: '#000000',
  b: '#ffffff',
  c: '#ff0000',
  d: '#0000ff',
  e: '#008000',
  f: '#ffff00',
  g: '#ffc0cb',
  h: '#808080',
  i: '#8B4513',
  j: '#ffa500',
  k: '#800080',
  l: '#f5f5dc',
  m: '#4b5320',
  // Common French names used in data
  noir: '#000000',
  blanc: '#ffffff',
  rouge: '#ff0000',
  bleu: '#0000ff',
  vert: '#008000',
  jaune: '#ffff00',
  rose: '#ffc0cb',
  gris: '#808080',
  marron: '#8B4513',
  orange: '#ffa500',
  violet: '#800080',
  beige: '#f5f5dc',
  kaki: '#4b5320'
};

export function resolveColor(value) {
  if (value === undefined || value === null) return '#000000';
  const s = String(value).trim();
  if (!s) return '#000000';
  if (s.startsWith('#') || s.startsWith('rgb') || s === 'transparent') return s;
  const key = s.toLowerCase();
  return COLOR_MAP[key] || '#000000';
}
