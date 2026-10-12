import { Heading, Text } from '@react-email/components';
import { render } from '@react-email/render';
import { EmailLayout } from './layout';
import { colors, fonts, type RenderedEmail } from './theme';

export type LoginCodeEmailData = { code: string; expiresInMinutes: number };

const paragraph = {
  color: colors.ink,
  fontFamily: fonts.sans,
  fontSize: 16,
  lineHeight: '24px',
  margin: '0 0 16px',
} as const;

export function LoginCodeEmail({ code, expiresInMinutes }: LoginCodeEmailData) {
  return (
    <EmailLayout preview={`Your login code is ${code}`}>
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
        Your login code
      </Heading>
      <Text style={paragraph}>Enter this code to sign in to Make My Marriage:</Text>
      <Text
        style={{
          backgroundColor: colors.sand,
          borderRadius: 12,
          color: colors.aubergine,
          fontFamily: fonts.sans,
          fontSize: 32,
          fontWeight: 600,
          letterSpacing: '0.3em',
          margin: '0 0 16px',
          padding: '16px 0',
          textAlign: 'center',
        }}
      >
        {code}
      </Text>
      <Text style={paragraph}>It expires in {expiresInMinutes} minutes and can be used once.</Text>
      <Text style={{ ...paragraph, color: colors.muted, fontSize: 14, margin: 0 }}>
        If you didn&apos;t ask for this code, you can ignore this email. Nobody can sign in without
        it.
      </Text>
    </EmailLayout>
  );
}

export async function renderLoginCodeEmail(data: LoginCodeEmailData): Promise<RenderedEmail> {
  const element = <LoginCodeEmail {...data} />;
  return {
    subject: `${data.code} is your Make My Marriage login code`,
    html: await render(element),
    text: await render(element, { plainText: true }),
  };
}
