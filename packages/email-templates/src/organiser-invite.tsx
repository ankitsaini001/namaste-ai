import { Button, Heading, Link, Text } from '@react-email/components';
import { render } from '@react-email/render';
import { EmailLayout } from './layout';
import { colors, fonts, type RenderedEmail } from './theme';

export type OrganiserInviteEmailData = {
  inviterName: string;
  weddingTitle: string;
  role: 'admin' | 'manager';
  joinUrl: string;
  /** The invited address, so they know which email to sign in with (ORG-03). */
  email: string;
  expiresInDays: number;
};

const paragraph = {
  color: colors.ink,
  fontFamily: fonts.sans,
  fontSize: 16,
  lineHeight: '24px',
  margin: '0 0 16px',
} as const;

const ROLE_TEXT = {
  manager: 'As a Manager, you can help with ceremonies, guests, invitations, the budget and more.',
  admin:
    'As an Admin, you can help with everything, including inviting organisers and changing settings.',
} as const;

const roleName = (role: OrganiserInviteEmailData['role']) =>
  role === 'admin' ? 'an Admin' : 'a Manager';

/** ORG-02: the invitation to help plan, with a join link that works for 7 days. */
export function OrganiserInviteEmail(data: OrganiserInviteEmailData) {
  return (
    <EmailLayout preview={`${data.inviterName} invited you to help plan ${data.weddingTitle}`}>
      <Heading
        as="h1"
        style={{
          color: colors.ink,
          fontFamily: fonts.serif,
          fontSize: 26,
          fontWeight: 400,
          margin: '0 0 16px',
        }}
      >
        Help plan {data.weddingTitle}
      </Heading>
      <Text style={paragraph}>
        {data.inviterName} has invited you to help plan {data.weddingTitle} on Make My Marriage as{' '}
        {roleName(data.role)}.
      </Text>
      <Text style={paragraph}>{ROLE_TEXT[data.role]}</Text>
      <Button
        href={data.joinUrl}
        style={{
          backgroundColor: colors.aubergine,
          borderRadius: 12,
          color: colors.ivory,
          display: 'inline-block',
          fontFamily: fonts.sans,
          fontSize: 16,
          fontWeight: 600,
          margin: '8px 0 24px',
          padding: '14px 28px',
          textDecoration: 'none',
        }}
      >
        Join the wedding
      </Button>
      <Text style={paragraph}>
        Sign in with this email address, {data.email}. The link works for {data.expiresInDays} days.
      </Text>
      <Text style={{ ...paragraph, color: colors.muted, fontSize: 14 }}>
        If the button doesn&apos;t work, open this link:{' '}
        <Link href={data.joinUrl} style={{ color: colors.aubergine, wordBreak: 'break-all' }}>
          {data.joinUrl}
        </Link>
      </Text>
      <Text style={{ ...paragraph, color: colors.muted, fontSize: 14, margin: 0 }}>
        If you weren&apos;t expecting this, you can ignore this email.
      </Text>
    </EmailLayout>
  );
}

export async function renderOrganiserInviteEmail(
  data: OrganiserInviteEmailData,
): Promise<RenderedEmail> {
  const element = <OrganiserInviteEmail {...data} />;
  return {
    subject: `${data.inviterName} invited you to help plan ${data.weddingTitle}`,
    html: await render(element),
    text: await render(element, { plainText: true }),
  };
}
