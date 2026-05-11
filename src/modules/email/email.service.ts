import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  async sendEmail(options: {
    to: string[];
    subject: string;
    html: string;
    replyTo?: string;
    cc?: string[];
  }) {
    try {
      await axios.post(
        'https://api.zeptomail.com/v1.1/email',
        {
          from: {
            address: process.env.ZEPTO_FROM_EMAIL!,
            name: process.env.ZEPTO_FROM_NAME!,
          },

          to: options.to.map((email) => ({
            email_address: { address: email },
          })),

          cc: options.cc?.map((email) => ({
            email_address: { address: email },
          })),

          subject: options.subject,
          htmlbody: options.html,

          reply_to: options.replyTo
            ? [{ address: options.replyTo }]
            : undefined,
        },
        {
          headers: {
            Authorization: `Zoho-enczapikey ${process.env.ZEPTO_API_KEY}`,
            'Content-Type': 'application/json',
          },
        },
      );

      this.logger.log(`Email sent to ${options.to}`);
      this.logger.log(`Email also sent to sent to ${options.cc}`);
    } catch (error: any) {
      this.logger.error(
        `ZeptoMail error sending to ${options.to}`,
        error?.response?.data || error.message,
      );
      throw error;
    }
  }
}
