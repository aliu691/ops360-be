import { Injectable, Logger } from '@nestjs/common';
import * as sgMail from '@sendgrid/mail';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor() {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY!);
  }

  async sendEmail(options: { to: string; subject: string; html: string }) {
    try {
      await sgMail.send({
        to: options.to,
        from: {
          email: process.env.SENDGRID_FROM_EMAIL!,
          name: process.env.SENDGRID_FROM_NAME!,
        },
        subject: options.subject,
        html: options.html,
      });
    } catch (error) {
      this.logger.error('SendGrid error', error);
      throw error;
    }
  }
}
