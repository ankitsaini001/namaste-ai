import { expect, test } from '@playwright/test';
import { expectAccessible, readLoginCode, uniqueEmail } from './support';

test.describe('email-code login', () => {
  test('a new organiser signs in, gives their name, and logs out', async ({ page }) => {
    const email = uniqueEmail('new');

    // Signed-in pages send visitors to the login page.
    await page.goto('/app');
    await expect(page).toHaveURL(/\/login\?returnTo=%2Fapp$/);
    await expect(page.getByRole('heading', { name: 'Welcome to Make My Marriage' })).toBeVisible();
    await expectAccessible(page);

    await page.getByLabel('Email address').fill(email);
    await page.getByRole('button', { name: 'Email me a code' }).click();
    await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible();
    await expect(page.getByText(email)).toBeVisible();
    await expectAccessible(page);

    // Typing all six digits submits the code.
    const code = await readLoginCode(email);
    await page.getByLabel('Digit 1 of 6').pressSequentially(code);

    await expect(page.getByRole('heading', { name: 'What should we call you?' })).toBeVisible();
    await page.getByLabel('Your name').fill('Princi Sharma');
    await page.getByRole('button', { name: 'Continue' }).click();

    await expect(page).toHaveURL(/\/app$/);
    await expect(page.getByRole('heading', { name: 'Welcome, Princi.' })).toBeVisible();
    await expectAccessible(page);

    await page.getByRole('button', { name: 'Log out' }).click();
    await expect(page).toHaveURL(/\/login$/);
    await page.goto('/app');
    await expect(page).toHaveURL(/\/login\?returnTo=%2Fapp$/);
  });

  test('a wrong code says how many tries are left', async ({ page }) => {
    const email = uniqueEmail('wrong');
    await page.goto('/login');
    await page.getByLabel('Email address').fill(email);
    await page.getByRole('button', { name: 'Email me a code' }).click();

    const code = await readLoginCode(email);
    const wrong = code === '000000' ? '111111' : '000000';
    await page.getByLabel('Digit 1 of 6').pressSequentially(wrong);

    await expect(page.getByText("That code isn't right. 4 tries left.")).toBeVisible();
    await expect(page.getByLabel('Digit 1 of 6')).toHaveValue('');
    await expectAccessible(page);

    // The right code still works afterwards.
    await page.getByLabel('Digit 1 of 6').pressSequentially(code);
    await expect(page.getByRole('heading', { name: 'What should we call you?' })).toBeVisible();
  });

  test('an invalid email is explained next to the field', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email address').fill('not-an-email');
    await page.getByRole('button', { name: 'Email me a code' }).click();
    await expect(
      page.getByText('Enter a valid email address, like you@example.com.'),
    ).toBeVisible();
    await expect(page.getByLabel('Email address')).toHaveAttribute('aria-invalid', 'true');
  });
});
