import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import HomePage from './page';

const html = renderToStaticMarkup(<HomePage />);

describe('homepage', () => {
  it('has exactly one h1, the tagline', () => {
    expect(html.match(/<h1\b/g)).toHaveLength(1);
    expect(html).toMatch(/<h1[^>]*>The calm behind the celebration\.<\/h1>/);
  });

  it('never skips a heading level', () => {
    const levels = [...html.matchAll(/<h([1-6])\b/g)].map((match) => Number(match[1]));
    levels.forEach((level, index) => {
      if (index > 0) expect(level - levels[index - 1]!).toBeLessThanOrEqual(1);
    });
  });

  it('renders the anchors the navigation links to', () => {
    for (const id of ['features', 'how-it-works', 'demo', 'faq', 'main']) {
      expect(html).toContain(`id="${id}"`);
    }
  });

  it('links the main buttons to login and the demo', () => {
    expect(html.match(/href="\/login"[^>]*>Start planning</g)?.length).toBeGreaterThanOrEqual(2);
    expect(html.match(/href="\/demo"[^>]*>See a demo wedding</g)).toHaveLength(2);
  });

  it('describes every product mockup for screen readers', () => {
    const mockups = [...html.matchAll(/role="img"(?: aria-label="([^"]*)")?/g)];
    expect(mockups.length).toBeGreaterThanOrEqual(10);
    mockups.forEach((match) => expect(match[1]).toBeTruthy());
  });

  it('starts with a skip link to the main content', () => {
    expect(html).toMatch(/^<a href="#main"[^>]*>Skip to content<\/a>/);
  });
});
