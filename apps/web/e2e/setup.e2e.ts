import { expect, test } from '@playwright/test';
import { expectAccessible, readJoinLink, readLoginCode, signUp, uniqueEmail } from './support';

/** A calendar day `days` from now, as the date inputs expect it (YYYY-MM-DD). */
const dayFromNow = (days: number) =>
  new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

test.describe('wedding setup', () => {
  test('a new organiser sets up their wedding, invites family, and a Manager joins', async ({
    page,
    browser,
  }) => {
    // Two people sign in, set up, invite and edit: well over the default 30 seconds.
    test.setTimeout(150_000);
    await signUp(page, 'Princi Sharma');
    await expect(page.getByText('Step 1 of 3')).toBeVisible();
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

    // Step 3: invite family (WED-01, ORG-01).
    await expect(page.getByText('Step 3 of 3')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Invite your family' })).toBeFocused();
    await expectAccessible(page);
    const rohitEmail = uniqueEmail('rohit');
    await page.getByLabel('Their name').fill('Rohit Sharma');
    await page.getByLabel('Their email address').fill(rohitEmail);
    await expect(page.getByLabel(/^Manager/)).toBeChecked();
    await page.getByRole('button', { name: 'Send invitation' }).click();
    await expect(page.getByText(`Invitation sent to ${rohitEmail}.`)).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Invited so far (1)' })).toBeVisible();
    await page.getByRole('button', { name: 'Go to your wedding' }).click();

    // The overview (DASH-01, DASH-03, DASH-06).
    await expect(page).toHaveURL(/\/app$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Princi & Akshay' })).toBeVisible();
    await expect(page.getByText('days to go')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Getting ready · 2 of 6 done' })).toBeVisible();
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

    // The Organisers page shows Rohit waiting to join (ORG-05).
    await page
      .getByRole('navigation', { name: 'Main' })
      .getByRole('link', { name: 'Organisers' })
      .filter({ visible: true })
      .click();
    await expect(page).toHaveURL(/\/app\/organisers$/);
    await expect(page.getByRole('heading', { name: 'Waiting to join (1)' })).toBeVisible();
    await expect(page.getByText(rohitEmail)).toBeVisible();
    await expectAccessible(page);

    // Rohit opens the join link in his own browser and signs in with the invited email (ORG-03).
    const rohitBrowser = await browser.newContext({ viewport: page.viewportSize() ?? undefined });
    const rohit = await rohitBrowser.newPage();
    await rohit.goto(await readJoinLink(rohitEmail));
    await expect(rohit.getByRole('heading', { name: 'Join the wedding' })).toBeVisible();
    await expect(
      rohit.getByText('Princi Sharma has invited you to help plan Princi & Akshay as a Manager.'),
    ).toBeVisible();
    await expectAccessible(rohit);
    await rohit.getByLabel('Email address').fill(rohitEmail);
    await rohit.getByRole('button', { name: 'Email me a code' }).click();
    await rohit.getByLabel('Digit 1 of 6').pressSequentially(await readLoginCode(rohitEmail));
    // The name he was invited with is filled in for him.
    await expect(rohit.getByLabel('Your name')).toHaveValue('Rohit Sharma');
    await rohit.getByRole('button', { name: 'Continue' }).click();

    await expect(rohit).toHaveURL(/\/app$/);
    await expect(rohit.getByRole('heading', { level: 1, name: 'Princi & Akshay' })).toBeVisible();
    await rohit.goto('/app/organisers');
    await expect(rohit.getByRole('heading', { name: 'Planning together (2)' })).toBeVisible();
    // Managers see who's helping but can't invite or change anyone (PRD §28).
    await expect(rohit.getByRole('heading', { name: 'Invite someone' })).toHaveCount(0);
    await expect(rohit.getByRole('button', { name: 'Leave this wedding' })).toBeVisible();
    await expectAccessible(rohit);
    // Settings are for Admins only.
    await expect(rohit.getByRole('link', { name: 'Settings' })).toHaveCount(0);
    await rohit.goto('/app/settings');
    await expect(rohit.getByText(/Only Admins can change the wedding’s settings/)).toBeVisible();
    await expect(rohit.getByLabel('Wedding title')).toHaveCount(0);
    await rohitBrowser.close();

    // Back with Princi: Rohit has joined.
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Planning together (2)' })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Waiting to join/ })).toHaveCount(0);

    // Princi edits the wedding details in Settings (WED-07).
    await page
      .getByRole('navigation', { name: 'Main' })
      .getByRole('link', { name: 'Settings' })
      .filter({ visible: true })
      .click();
    await expect(page.getByRole('heading', { name: 'Wedding details' })).toBeVisible();
    await expect(page.getByText('This is your current address.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save changes' })).toBeDisabled();
    await expectAccessible(page);
    await page.getByLabel('Wedding title').fill('Princi & Akshay Sharma');
    await page.getByLabel('City').fill('Mussoorie');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByText('Saved.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save changes' })).toBeDisabled();

    await page.goto('/app');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Princi & Akshay Sharma' }),
    ).toBeVisible();
    await expect(page.getByText(/· Mussoorie/)).toBeVisible();
  });
});
