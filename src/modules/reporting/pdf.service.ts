import puppeteer from 'puppeteer';

export class PdfService {
  async generateMeetingReportPdf(html: string): Promise<Buffer> {
    const browser = await puppeteer.launch({
      headless: true,

      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,

      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });

    const page = await browser.newPage();

    await page.setContent(html, {
      waitUntil: 'networkidle0',
    });

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        bottom: '20px',
        left: '20px',
        right: '20px',
      },
    });

    await browser.close();

    return Buffer.from(pdf);
  }
}
