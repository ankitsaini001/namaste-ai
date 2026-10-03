/**
 * App routes linked from public pages. Login (AUTH) and the demo (DEMO) are built in later
 * features; until then these links lead to the not-found page.
 */
export const ROUTES = {
  home: '/',
  login: '/login',
  demo: '/demo',
  about: '/about',
  contact: '/contact',
  privacy: '/privacy',
  terms: '/terms',
} as const;
