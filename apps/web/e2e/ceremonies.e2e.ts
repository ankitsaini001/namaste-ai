import { expect, type Page, test } from '@playwright/test';
import { expectAccessible, signUp } from './support';

/** A calendar day `days` from now (YYYY-MM-DD). */
const dayFromNow = (days: number) =>
  new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

/** Creates the signed-in user's wedding through the API, with one ceremony, and finishes setup. */
async function createWedding(page: Page, weddingDay: string) {
  await page.evaluate(async (day) => {
    const call = (path: string, body: object) =>
      fetch(`http://localhost:4000/v1${path}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    await call('/wedding', {
      brideName: 'Diya',
      groomName: 'Aarav',
      title: 'Diya & Aarav',
      date: day,
      city: 'Jaipur',
      slug: `diya-aarav-${Date.now().toString(36)}`,
      events: [{ type: 'wedding', name: 'Wedding', startsAt: `${day}T13:30:00.000Z` }],
    });
    await call('/wedding/setup-step', { step: 'done' });
  }, weddingDay);
}

test.describe('ceremonies (EVT)', () => {
  test('an organiser adds, changes and deletes a ceremony', async ({ page }) => {
    test.setTimeout(90_000);
    await signUp(page, 'Diya Mehta');
    const weddingDay = dayFromNow(100);
    await createWedding(page, weddingDay);

    await page.goto('/app/ceremonies');
    await expect(page.getByRole('heading', { level: 1, name: 'Ceremonies' })).toBeVisible();
    await expect(page.getByText('1 of 20')).toBeVisible();
    await expectAccessible(page);

    // Add a Sangeet: it starts the day before the wedding at its usual time (owner's decision).
    await page.getByRole('link', { name: 'Add ceremony' }).click();
    await expect(page.getByRole('heading', { name: 'Add a ceremony' })).toBeVisible();
    await page.getByRole('button', { name: 'Add ceremony' }).click();
    await expect(page.getByText('Choose which ceremony this is.')).toBeVisible();
    await page.getByText('Sangeet', { exact: true }).click();
    await expect(page.getByLabel('Ceremony name')).toHaveValue('Sangeet');
    await expect(page.getByLabel('Date')).toHaveValue(dayFromNow(99));
    await expect(page.getByLabel('Starts (IST)')).toHaveValue('19:00');
    await page.getByLabel('Ends (optional)').fill('01:00');
    await expect(page.getByText('Ends the next morning.')).toBeVisible();
    await page.getByLabel('Venue (optional)').fill('Royal Garden');
    await page.getByLabel('Address (optional)').fill('Rajpur Road, Jaipur');
    await page.getByLabel('Google Maps link (optional)').fill('not a link');
    await page.getByLabel('Dress code (optional)').fill('Green / Traditional');
    await page.getByLabel('YouTube Live link (optional)').fill('https://youtu.be/live123');
    await expectAccessible(page);
    await page.getByRole('button', { name: 'Add ceremony' }).click();
    await expect(page.getByText(/whole link from Google Maps/)).toBeVisible();
    await expect(page.getByLabel('Google Maps link (optional)')).toBeFocused();
    await page.getByLabel('Google Maps link (optional)').fill('https://maps.app.goo.gl/abc123');
    await page.getByRole('button', { name: 'Add ceremony' }).click();

    // The list, by date and time, with who added it.
    await expect(page).toHaveURL(/\/app\/ceremonies$/);
    await expect(page.getByText('2 of 20')).toBeVisible();
    const cards = page.getByRole('main').getByRole('listitem');
    await expect(cards).toHaveText([
      /Sangeet.*Live stream.*7:00 pm – 1:00 am \(next day\)/,
      /Wedding/,
    ]);
    await expect(cards.first()).toContainText('Royal Garden · Rajpur Road, Jaipur');
    await expect(cards.first()).toContainText('Added by Diya Mehta');

    // Change it: renamed and private.
    await page.getByRole('link', { name: 'Sangeet' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Sangeet' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save changes' })).toBeDisabled();
    await expectAccessible(page);
    await page.getByLabel('Ceremony name').fill('Sangeet Night');
    await page.getByText('Show on wedding website').click();
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByText('Saved.')).toBeVisible();
    await expect(page.getByText(/Last changed by Diya Mehta/)).toBeVisible();

    await page.getByRole('link', { name: 'All ceremonies' }).click();
    await expect(cards.first()).toContainText('Sangeet Night');
    await expect(cards.first()).toContainText('Private');

    // Delete it, after seeing what it affects (EVT-06).
    await page.getByRole('link', { name: 'Sangeet Night' }).click();
    await page.getByRole('button', { name: 'Delete Sangeet Night' }).click();
    await expect(page.getByText('Its photo album will be deleted.')).toBeVisible();
    await expect(page.getByText('Nothing else is linked to it yet.')).toBeVisible();
    await expectAccessible(page);
    await page.getByRole('button', { name: 'Delete ceremony' }).click();
    await expect(page).toHaveURL(/\/app\/ceremonies$/);
    await expect(page.getByText('1 of 20')).toBeVisible();

    // The last ceremony can't be deleted.
    await page.getByRole('link', { name: 'Wedding', exact: true }).click();
    await expect(
      page.getByText('This is the wedding’s only ceremony. Add another ceremony first.'),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: /^Delete/ })).toHaveCount(0);
  });
});
