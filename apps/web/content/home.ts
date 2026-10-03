import { ROUTES } from '@/lib/routes';

/**
 * Homepage copy, from the UX & Visual Design Brief (section 11). Edit wording here; layout lives
 * in components/home. Keep every claim true to the PRD: no pricing, no "free", no SMS or
 * WhatsApp sending, and no promise that all data stays in India.
 */

export type IconKey =
  | 'users'
  | 'headcount'
  | 'photos'
  | 'couple'
  | 'family'
  | 'link'
  | 'lock'
  | 'hidden'
  | 'no-ads'
  | 'control';

export const nav = {
  links: [
    { label: 'Features', href: '#features' },
    { label: 'How it works', href: '#how-it-works' },
    { label: 'Demo', href: '#demo' },
    { label: 'FAQ', href: '#faq' },
  ],
  logIn: { label: 'Log in', href: ROUTES.login },
  cta: { label: 'Start planning', href: ROUTES.login },
} as const;

export const hero = {
  eyebrow: 'Wedding planning for Indian families',
  title: 'The calm behind the celebration.',
  lead: 'Plan every ceremony from Roka to Reception, invite each guest to the right events, and keep RSVPs, budgets and photos in one place, together with your family.',
  primary: { label: 'Start planning', href: ROUTES.login },
  secondary: { label: 'See a demo wedding', href: ROUTES.demo },
  trust: ["Guests don't need an app", 'Your guest list stays private', 'No ads'],
} as const;

export const problem = {
  eyebrow: 'Sound familiar?',
  title: 'Seven ceremonies. 400 guests. Three WhatsApp groups. One notebook.',
  cards: [
    {
      icon: 'users',
      title: 'Someone always gets forgotten',
      text: 'Relatives slip through the cracks when lists live in notebooks and chats.',
    },
    {
      icon: 'headcount',
      title: 'Nobody knows the headcount',
      text: "Every caterer asks for numbers for every function, and you're guessing.",
    },
    {
      icon: 'photos',
      title: 'Photos end up everywhere',
      text: 'Hundreds of moments, scattered across dozens of phones.',
    },
  ],
} as const satisfies { eyebrow: string; title: string; cards: readonly ProblemCard[] };

type ProblemCard = { icon: IconKey; title: string; text: string };

export const howItWorks = {
  eyebrow: 'How it works',
  title: 'Calm, in three steps',
  steps: [
    {
      title: 'Add your ceremonies',
      text: 'Roka, Haldi, Sangeet, Wedding, Reception, or anything you celebrate.',
    },
    {
      title: 'Invite each guest to the right ones',
      text: 'Choose events for each guest. Everyone gets a personal invitation link.',
    },
    {
      title: 'Watch it come together',
      text: 'RSVPs, budgets and photos update in one place, for the whole family.',
    },
  ],
} as const;

export type FeatureMockup = 'guests' | 'invitation' | 'website' | 'budget' | 'gallery' | 'tasks';

export const features = {
  rows: [
    {
      mockup: 'guests',
      eyebrow: 'Guests and RSVP',
      title: 'Every guest, invited to the right ceremonies.',
      text: 'Decide who comes to the Haldi and who comes to the Reception, and see the headcount for each one.',
      points: ['Event-wise guest lists', 'RSVP per ceremony', 'Live headcount for caterers'],
    },
    {
      mockup: 'invitation',
      eyebrow: 'Invitations',
      title: 'Invitations that reach everyone.',
      text: 'Every guest gets a personal link by email, and you can share it on WhatsApp in one tap.',
      points: ['Personal invitation links', 'Email and WhatsApp sharing', 'Gentle RSVP reminders'],
    },
    {
      mockup: 'website',
      eyebrow: 'Wedding website',
      title: 'A beautiful website, ready in minutes.',
      text: 'Your ceremonies, venues and live stream on one elegant page, built from your plan.',
      points: ['Three refined themes', 'Venue maps', 'YouTube live stream'],
    },
    {
      mockup: 'budget',
      eyebrow: 'Budget and payments',
      title: 'Money, without the mess.',
      text: "Set a budget, record what you've agreed with each vendor, and never miss an installment.",
      points: ['Budget by category', 'Installments and due dates', 'Receipts in one place'],
    },
    {
      mockup: 'gallery',
      eyebrow: 'Shared gallery',
      title: 'Every photo, in one place.',
      text: "Guests scan a QR code at the venue and their photos land in the right ceremony's album.",
      points: ['QR code uploads', 'Albums by ceremony', 'Download everything'],
    },
    {
      mockup: 'tasks',
      eyebrow: 'Planning tools',
      title: 'Tasks, shopping and vendors, all organised.',
      text: "Share the to-do list with your family, track what to buy, and keep every vendor's details together.",
      points: ['Shared tasks', 'Shopping list', 'Vendor contacts'],
    },
  ],
} as const satisfies {
  rows: readonly {
    mockup: FeatureMockup;
    eyebrow: string;
    title: string;
    text: string;
    points: readonly string[];
  }[];
};

export const family = {
  eyebrow: 'Together',
  title: 'Planned together, by the whole family',
  columns: [
    { icon: 'couple', title: 'The couple', text: 'Run the plan and choose who helps.' },
    {
      icon: 'family',
      title: 'Parents and siblings',
      text: 'Add relatives, track payments and tick off tasks.',
    },
    { icon: 'link', title: 'Guests', text: 'Need nothing but a link. No app, no sign-up.' },
  ],
} as const satisfies {
  eyebrow: string;
  title: string;
  columns: readonly { icon: IconKey; title: string; text: string }[];
};

export const guestView = {
  eyebrow: 'For your guests',
  title: 'Simple enough for Nani',
  text: 'Guests open one link to see their ceremonies, RSVP in a tap, and share their photos.',
} as const;

export const demo = {
  title: 'See a wedding planned with Make My Marriage',
  text: 'Explore a complete sample wedding: guests, budget, website and gallery. No sign-up needed.',
  cta: { label: 'Explore the demo', href: ROUTES.demo },
} as const;

export const privacy = {
  eyebrow: 'Privacy',
  title: "Your family's details stay yours",
  items: [
    {
      icon: 'lock',
      title: 'Private guest list',
      text: 'Only your organisers see it. Guests see only their own invitation.',
    },
    {
      icon: 'hidden',
      title: 'Hidden from search engines',
      text: 'Your website, invitations and gallery are kept out of search results.',
    },
    { icon: 'no-ads', title: 'No ads', text: "We don't show ads or sell your data." },
    {
      icon: 'control',
      title: "You're in control",
      text: 'Remove photos, reset links or delete everything whenever you want.',
    },
  ],
} as const satisfies {
  eyebrow: string;
  title: string;
  items: readonly { icon: IconKey; title: string; text: string }[];
};

export const faq = {
  eyebrow: 'Questions',
  title: 'Good to know',
  items: [
    {
      question: 'Do our guests need to download an app?',
      answer: 'No. Guests just open their personal link on any phone or computer.',
    },
    {
      question: 'Who can see our guest list?',
      answer: 'Only the organisers you invite. Each guest sees only their own invitation.',
    },
    {
      question: 'Can our parents help plan?',
      answer:
        'Yes. Invite family members as organisers, and they can add guests, track payments and manage tasks.',
    },
    {
      question: "What if some relatives don't use email?",
      answer: 'Share their personal invitation link on WhatsApp in one tap.',
    },
    {
      question: 'Do we have to plan every ceremony here?',
      answer: 'No. Add only the ceremonies you want.',
    },
    {
      question: 'How do guests share their photos?',
      answer:
        "They scan the QR code at the venue or use their invitation link, and photos go into the right ceremony's album.",
    },
  ],
} as const;

export const finalCta = {
  title: 'Begin with calm.',
  text: 'Set up your ceremonies in minutes and invite your family to plan with you.',
  primary: { label: 'Start planning', href: ROUTES.login },
  secondary: { label: 'See a demo wedding', href: ROUTES.demo },
} as const;

export const footer = {
  tagline: 'The calm behind the celebration.',
  columns: [
    {
      title: 'Product',
      links: [
        { label: 'Features', href: '#features' },
        { label: 'How it works', href: '#how-it-works' },
        { label: 'Demo', href: ROUTES.demo },
      ],
    },
    {
      title: 'Company',
      links: [
        { label: 'About', href: ROUTES.about },
        { label: 'Contact', href: ROUTES.contact },
      ],
    },
    {
      title: 'Legal',
      links: [
        { label: 'Privacy', href: ROUTES.privacy },
        { label: 'Terms', href: ROUTES.terms },
      ],
    },
  ],
  copyright: '© 2026 Make My Marriage · Made in India',
} as const;
