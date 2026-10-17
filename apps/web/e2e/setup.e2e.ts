import { expect, test } from '@playwright/test';
import { expectAccessible, signUp } from './support';

/** A calendar day `days` from now, as the date inputs expect it (YYYY-MM-DD). */
const dayFromNow = (days: number) =>
  new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

test.describe('wedding setup', () => {
  test('a new organiser sets up their wedding and sees the overview', async ({ page }) => {
    await signUp(page, 'Princi Sharma');
    await expect(page.getByText('Step 1 of 2')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Your wedding' })).toBeVisible();
    await expectAccessible(page);

    // Nothing filled in: each problem is explained next to its field.
    await page.getByRole('button', { name: 'Continue to ceremonies' }).click();
    await expect(page.getByText("Enter the bride's name.")).toBeVisible();
    await expect(page.getByLabel('Bride’s name')).toBeFocused();

    // The title and website address fill in from the names (WED-03, WED-04).
    await page.getByLabel('Bride’s name').fill('Princi');
    await page.getByLabel('Groom’s name').fill('Akshay');
    await expect(page.getByLabel('Wedding title')).toHaveValue('Princi & Akshay');
    const address = page.getByLabel('Website address');
    await expect(address).toHaveValue('princi-akshay');

    await address.fill('login');
    await expect(page.getByText('That address is reserved. Please choose another.')).toBeVisible();
    const slug = `princi-akshay-${Date.now().toString(36)}`;
    await address.fill(slug);
    await expect(page.getByText('This address is available.')).toBeVisible();

    const weddingDay = dayFromNow(120);
    await page.getByLabel('Wedding date').fill(weddingDay);
    await page.getByLabel('City').fill('Jaipur');
    await expectAccessible(page);
    await page.getByRole('button', { name: 'Continue to ceremonies' }).click();

    // Step 2 starts with the wedding itself, on the wedding day.
    await expect(page.getByRole('heading', { name: 'Your ceremonies', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Wedding', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await page.getByRole('button', { name: 'Mehendi' }).click();
    const rows = page.getByRole('listitem');
    await expect(rows).toHaveCount(2);
    await rows.nth(1).getByLabel('Date').fill(dayFromNow(119));

    await page.getByRole('button', { name: 'Add another ceremony' }).click();
    await expect(rows.nth(2).getByLabel('Ceremony name')).toBeFocused();
    await rows.nth(2).getByLabel('Ceremony name').fill('Family puja');
    await rows.nth(2).getByLabel('Start time (IST)').fill('09:30');
    // People tap the label; the switch's own checkbox is visually hidden.
    await rows.nth(2).getByText('Show on wedding website').click();
    await expect(
      rows.nth(2).getByRole('switch', { name: /Show on wedding website/ }),
    ).not.toBeChecked();
    await expectAccessible(page);

    // A refresh keeps what was typed and the step (WED-10).
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Your ceremonies', exact: true })).toBeVisible();
    await expect(rows).toHaveCount(3);
    await expect(rows.nth(2).getByLabel('Ceremony name')).toHaveValue('Family puja');

    await page.getByRole('button', { name: 'Create our wedding' }).click();

    // The overview (DASH-01, DASH-03, DASH-06).
    await expect(page).toHaveURL(/\/app$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Princi & Akshay' })).toBeVisible();
    await expect(page.getByText('days to go')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Getting ready · 1 of 6 done' })).toBeVisible();
    const upcoming = page.getByRole('region', { name: 'Upcoming ceremonies' });
    await expect(upcoming.getByRole('listitem')).toHaveText([
      /Mehendi/,
      /Family puja.*Private/,
      /Wedding/,
    ]);
    await expectAccessible(page);

    // Setup is done: going back to it lands on the overview.
    await page.goto('/setup');
    await expect(page).toHaveURL(/\/app$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Princi & Akshay' })).toBeVisible();
  });
});
