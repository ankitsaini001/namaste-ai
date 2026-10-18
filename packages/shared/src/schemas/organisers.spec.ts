import { describe, expect, it } from 'vitest';
import { changeOrganiserRoleSchema, inviteOrganiserSchema, maskEmail } from './organisers';

describe('maskEmail', () => {
  it.each([
    ['rohit@gmail.com', 'r•••@gmail.com'],
    ['a@b.co', 'a•••@b.co'],
    ['not-an-email', '•••'],
  ])('%s → %s', (email, masked) => {
    expect(maskEmail(email)).toBe(masked);
  });
});

describe('inviteOrganiserSchema', () => {
  it('trims and lowercases', () => {
    expect(
      inviteOrganiserSchema.parse({
        name: ' Rohit Sharma ',
        email: ' Rohit@Gmail.com ',
        role: 'manager',
      }),
    ).toEqual({ name: 'Rohit Sharma', email: 'rohit@gmail.com', role: 'manager' });
  });

  it.each([
    [{ name: '', email: 'r@x.com', role: 'manager' }, 'Enter their name.'],
    [{ name: 'Rohit', email: '', role: 'manager' }, 'Enter their email address.'],
    [{ name: 'Rohit', email: 'rohit@', role: 'manager' }, /valid email/],
    [{ name: 'Rohit', email: 'r@x.com', role: 'demo' }, 'Choose Admin or Manager.'],
    [{ name: 'x'.repeat(61), email: 'r@x.com', role: 'admin' }, /under 61/],
  ])('rejects %j', (input, message) => {
    const issue = inviteOrganiserSchema.safeParse(input).error?.issues[0]?.message;
    expect(issue).toMatch(message);
  });
});

describe('changeOrganiserRoleSchema', () => {
  it('accepts only Admin or Manager', () => {
    expect(changeOrganiserRoleSchema.safeParse({ role: 'admin' }).success).toBe(true);
    expect(changeOrganiserRoleSchema.safeParse({ role: 'owner' }).success).toBe(false);
  });
});
