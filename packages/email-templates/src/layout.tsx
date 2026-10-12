import { Body, Container, Head, Html, Preview, Section, Text } from '@react-email/components';
import type { ReactNode } from 'react';
import { colors, fonts } from './theme';

/** The shared frame for every email: light, text first, one clear action (System Design §13.5). */
export function EmailLayout({ preview, children }: { preview: string; children: ReactNode }) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ backgroundColor: colors.ivory, margin: 0, padding: '32px 0' }}>
        <Container
          style={{
            backgroundColor: '#FFFFFF',
            border: `1px solid ${colors.line}`,
            borderRadius: 16,
            maxWidth: 520,
            padding: '40px 32px',
          }}
        >
          <Text
            style={{
              color: colors.ink,
              fontFamily: fonts.serif,
              fontSize: 20,
              margin: '0 0 24px',
            }}
          >
            Make My Marriage
          </Text>
          {children}
        </Container>
        <Section style={{ maxWidth: 520, margin: '0 auto', padding: '16px 32px' }}>
          <Text style={{ color: colors.muted, fontFamily: fonts.sans, fontSize: 12, margin: 0 }}>
            The calm behind the celebration.
          </Text>
        </Section>
      </Body>
    </Html>
  );
}
