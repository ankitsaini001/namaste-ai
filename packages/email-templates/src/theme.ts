/** Brand colours and fonts for email (UX & Visual Design Brief §3). Email clients need inline styles. */
export const colors = {
  ivory: '#FAF7F2',
  sand: '#F1EBE2',
  ink: '#1E1A1D',
  muted: '#6E6468',
  line: '#E6DDD2',
  aubergine: '#3A2340',
  champagneInk: '#7D6232',
} as const;

// Fraunces and Inter aren't available in most email clients; these are close, safe fallbacks.
export const fonts = {
  serif: "Georgia, 'Times New Roman', serif",
  sans: "'Helvetica Neue', Helvetica, Arial, sans-serif",
} as const;

export type RenderedEmail = { subject: string; html: string; text: string };
