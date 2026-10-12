import { describe, expect, it } from 'vitest';
import { renderLoginCodeEmail } from './login-code';

describe('renderLoginCodeEmail', () => {
  it('puts the code in the subject, the HTML and the plain-text version', async () => {
    const email = await renderLoginCodeEmail({ code: '482913', expiresInMinutes: 10 });
    expect(email.subject).toBe('482913 is your Make My Marriage login code');
    expect(email.html).toContain('482913');
    expect(email.html).toMatch(/<html[^>]*lang="en"/);
    expect(email.text).toContain('482913');
    expect(email.text).toContain('expires in 10 minutes');
  });

  it('never asks for a password', async () => {
    const email = await renderLoginCodeEmail({ code: '000111', expiresInMinutes: 10 });
    expect(email.text).not.toMatch(/password/i);
  });
});
