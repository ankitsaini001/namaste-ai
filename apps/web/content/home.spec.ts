import { describe, expect, it } from 'vitest';
import * as home from './home';

/** Every string in the homepage content, flattened. */
function allText(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(allText);
  if (value && typeof value === 'object') return Object.values(value).flatMap(allText);
  return [];
}

const text = allText(home).join('\n');

describe('homepage content', () => {
  // Claims the PRD and UX brief rule out for V1.
  it.each([
    ['pricing or "free" (pricing is undecided)', /\bfree\b|pric(e|ing)|cost/i],
    [
      'SMS or automated WhatsApp sending (V1 has a share button only)',
      /\bSMS\b|send via whatsapp/i,
    ],
    ['full-resolution photos (photos are shrunk on the phone)', /full resolution|no compression/i],
    ['all data staying in India (photos are stored with Cloudflare)', /stays? in India/i],
    [
      'features outside V1 (travel, meal preferences, seating)',
      /itinerary|travel|dietary|veg|seating/i,
    ],
    ['off-brand naming from the Stitch draft', /atelier/i],
  ])('never mentions %s', (_label, pattern) => {
    expect(text).not.toMatch(pattern);
  });

  it('keeps "See a demo wedding" as the second button wherever both appear', () => {
    expect(home.hero.secondary.label).toBe('See a demo wedding');
    expect(home.finalCta.secondary.label).toBe('See a demo wedding');
  });

  it('uses the brief’s tagline as the hero headline', () => {
    expect(home.hero.title).toBe('The calm behind the celebration.');
  });
});
