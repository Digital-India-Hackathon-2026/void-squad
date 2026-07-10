// DeCode.it Design Tokens — matches web dark theme
export const C = {
  bg:       '#0a0a0f',
  surface:  '#131318',
  surface2: '#1c1c24',
  border:   'rgba(255,255,255,0.08)',
  text:     '#f0f0f5',
  muted:    '#7a7a8a',
  primary:  '#4edea3',   // safe/low risk green
  secondary:'#ffb95f',  // moderate risk orange
  error:    '#ffb4ab',   // high risk red-pink
  tertiary: '#8ab4f8',
};

export const RISK: Record<string, { color: string; bg: string; label: string; stroke: string }> = {
  Low:      { color: C.primary,   bg: C.primary   + '22', label: 'Low Risk',   stroke: C.primary   },
  Moderate: { color: C.secondary, bg: C.secondary + '22', label: 'Moderate',   stroke: C.secondary },
  High:     { color: C.error,     bg: C.error     + '22', label: 'High Risk',  stroke: C.error     },
};

export function normalizeBand(raw: string | null | undefined): 'Low' | 'Moderate' | 'High' {
  if (!raw) return 'Low';
  const s = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
  if (s === 'High' || s === 'Moderate' || s === 'Low') return s as any;
  return 'Low';
}
