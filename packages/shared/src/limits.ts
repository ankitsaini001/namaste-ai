/** Per-wedding limits (PRD §29.2). The API enforces them; the web app uses them in forms. */
export const LIMITS = {
  organisers: 20,
  events: 20,
  guests: 1000,
  tasks: 500,
  shoppingItems: 1000,
  vendors: 200,
  expenses: 500,
  photos: 2000,
} as const;

export type LimitedResource = keyof typeof LIMITS;
