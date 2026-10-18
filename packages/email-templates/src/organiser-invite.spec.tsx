import { describe, expect, it } from 'vitest';
import { renderOrganiserInviteEmail } from './organiser-invite';

const data = {
  inviterName: 'Princi Sharma',
  weddingTitle: 'Princi & Akshay',
  role: 'manager' as const,
  joinUrl: 'https://makemymarriage.com/join/abc123',
  email: 'rohit@gmail.com',
  expiresInDays: 7,
};

describe('renderOrganiserInviteEmail', () => {
  it('names the inviter, the wedding and the role, with the join link', async () => {
    const email = await renderOrganiserInviteEmail(data);
    expect(email.subject).toBe('Princi Sharma invited you to help plan Princi & Akshay');
    expect(email.html).toContain('href="https://makemymarriage.com/join/abc123"');
    expect(email.text).toContain('as a Manager');
    expect(email.text).toContain('rohit@gmail.com');
    expect(email.text).toContain('works for 7 days');
  });

  it('describes what an Admin can do', async () => {
    const email = await renderOrganiserInviteEmail({ ...data, role: 'admin' });
    expect(email.text).toContain('as an Admin');
    expect(email.text).toMatch(/inviting organisers and changing settings/);
  });
});
