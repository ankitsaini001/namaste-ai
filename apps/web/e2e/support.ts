import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

const MAILPIT = process.env.MAILPIT_URL ?? 'http://localhost:8025';

/** A unique address per test run, so tests never share login codes or rate limits. */
export const uniqueEmail = (label: string) =>
  `e2e.${label}.${Date.now()}.${Math.random().toString(36).slice(2, 7)}@example.com`;

/** Waits for the login-code email to reach Mailpit and returns the code from its subject. */
export async function readLoginCode(email: string, timeoutMs = 20_000): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const res = await fetch(
      `${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${email}"`)}`,
    );
    const body = (await res.json()) as { messages: { Subject: string }[] };
    const match = body.messages[0]?.Subject.match(/^(\d{6}) /);
    if (match) return match[1]!;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`No login code email for ${email} within ${timeoutMs}ms`);
}

/** Signs a brand-new organiser in with an email code and gives their name; ends on /setup. */
export async function signUp(page: Page, name: string, email = uniqueEmail('user')) {
  await page.goto('/login');
  await page.getByLabel('Email address').fill(email);
  await page.getByRole('button', { name: 'Email me a code' }).click();
  await page.getByLabel('Digit 1 of 6').pressSequentially(await readLoginCode(email));
  await page.getByLabel('Your name').fill(name);
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page).toHaveURL(/\/setup$/);
  return email;
}

/** Fails the test on any WCAG 2.1 AA violation. */
export async function expectAccessible(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
}
