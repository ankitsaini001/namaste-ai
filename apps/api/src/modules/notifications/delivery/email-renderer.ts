import { Injectable } from '@nestjs/common';
import {
  type RenderedEmail,
  renderLoginCodeEmail,
  renderOrganiserInviteEmail,
} from '@mmm/email-templates';
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
      case 'organiser_invite':
        if (typeof data.joinUrl !== 'string') throw new Error('organiser_invite email has no link');
        return renderOrganiserInviteEmail({
          inviterName: String(data.inviterName),
          weddingTitle: String(data.weddingTitle),
          role: data.role === 'admin' ? 'admin' : 'manager',
          joinUrl: data.joinUrl,
          email: String(data.email),
          expiresInDays: Number(data.expiresInDays ?? 7),
        });
      default:
        throw new Error(`No email template for ${kind}`);
    }
  }
}
