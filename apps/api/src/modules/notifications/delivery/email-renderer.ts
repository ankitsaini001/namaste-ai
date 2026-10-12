import { Injectable } from '@nestjs/common';
import { type RenderedEmail, renderLoginCodeEmail } from '@mmm/email-templates';
import type { EmailKind } from '../email.schema';

/** Turns an email record into subject, HTML and text. Templates are added with their features. */
@Injectable()
export class EmailRenderer {
  async render(kind: EmailKind, data: Record<string, unknown>): Promise<RenderedEmail> {
    switch (kind) {
      case 'login_code':
        if (typeof data.code !== 'string') throw new Error('login_code email has no code');
        return renderLoginCodeEmail({
          code: data.code,
          expiresInMinutes: Number(data.expiresInMinutes ?? 10),
        });
      default:
        throw new Error(`No email template for ${kind}`);
    }
  }
}
